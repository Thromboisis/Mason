/**
 * Quadratic Error Function (QEF) Solver & Normal Quantizer
 * 
 * Used by Feature-Preserving Surface Nets / Dual Contouring to position
 * vertices inside voxels where surface features (sharp ridges, planar flats,
 * beveled edges) occur, with mass-point fallback for smooth areas.
 * 
 * Includes 22.5° (16-point compass) normal quantization as specified in engine spec.
 */

import { NORMAL_QUANTIZATION_ANGLE_DEG } from './voxelTypes';

export interface HermiteIntersection {
  point: [number, number, number];  // Intersection point on edge
  normal: [number, number, number]; // Normalized gradient at intersection
}

export class QEFSolver3D {
  // Symmetric matrix A^T * A (6 independent elements)
  private ata_00 = 0;
  private ata_01 = 0;
  private ata_02 = 0;
  private ata_11 = 0;
  private ata_12 = 0;
  private ata_22 = 0;

  // Vector A^T * b (3 elements)
  private atb_0 = 0;
  private atb_1 = 0;
  private atb_2 = 0;

  // Mass point accumulator
  private massX = 0;
  private massY = 0;
  private massZ = 0;
  private count = 0;

  public reset(): void {
    this.ata_00 = 0;
    this.ata_01 = 0;
    this.ata_02 = 0;
    this.ata_11 = 0;
    this.ata_12 = 0;
    this.ata_22 = 0;
    this.atb_0 = 0;
    this.atb_1 = 0;
    this.atb_2 = 0;
    this.massX = 0;
    this.massY = 0;
    this.massZ = 0;
    this.count = 0;
  }

  /**
   * Adds an edge intersection plane: dot(normal, (x - point)) = 0
   */
  public addPlane(px: number, py: number, pz: number, nx: number, ny: number, nz: number): void {
    this.ata_00 += nx * nx;
    this.ata_01 += nx * ny;
    this.ata_02 += nx * nz;
    this.ata_11 += ny * ny;
    this.ata_12 += ny * nz;
    this.ata_22 += nz * nz;

    const dot = nx * px + ny * py + nz * pz;
    this.atb_0 += dot * nx;
    this.atb_1 += dot * ny;
    this.atb_2 += dot * nz;

    this.massX += px;
    this.massY += py;
    this.massZ += pz;
    this.count++;
  }

  /**
   * Solves for the optimal point inside the voxel cell [minBound, maxBound]
   * Returns [x, y, z] clamped to cell bounds.
   */
  public solve(
    minX: number, minY: number, minZ: number,
    maxX: number, maxY: number, maxZ: number
  ): [number, number, number] {
    if (this.count === 0) {
      return [(minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5];
    }

    const massPointX = this.massX / this.count;
    const massPointY = this.massY / this.count;
    const massPointZ = this.massZ / this.count;

    // Regularize with mass point to prevent singularity when planes are parallel
    const lambda = 0.05;
    const a00 = this.ata_00 + lambda;
    const a01 = this.ata_01;
    const a02 = this.ata_02;
    const a11 = this.ata_11 + lambda;
    const a12 = this.ata_12;
    const a22 = this.ata_22 + lambda;

    const b0 = this.atb_0 + lambda * massPointX;
    const b1 = this.atb_1 + lambda * massPointY;
    const b2 = this.atb_2 + lambda * massPointZ;

    // Determinant of symmetric 3x3
    const det = a00 * (a11 * a22 - a12 * a12)
              - a01 * (a01 * a22 - a12 * a02)
              + a02 * (a01 * a12 - a11 * a02);

    let solX = massPointX;
    let solY = massPointY;
    let solZ = massPointZ;

    if (Math.abs(det) > 1e-6) {
      const invDet = 1.0 / det;

      // Inverse 3x3 elements
      const inv00 = (a11 * a22 - a12 * a12) * invDet;
      const inv01 = (a02 * a12 - a01 * a22) * invDet;
      const inv02 = (a01 * a12 - a02 * a11) * invDet;

      const inv11 = (a00 * a22 - a02 * a02) * invDet;
      const inv12 = (a02 * a01 - a00 * a12) * invDet;

      const inv22 = (a00 * a11 - a01 * a01) * invDet;

      solX = inv00 * b0 + inv01 * b1 + inv02 * b2;
      solY = inv01 * b0 + inv11 * b1 + inv12 * b2;
      solZ = inv02 * b0 + inv12 * b1 + inv22 * b2;
    }

    // Clamp strictly inside cell bounds with margin
    const margin = 0.01;
    solX = Math.max(minX + margin, Math.min(maxX - margin, solX));
    solY = Math.max(minY + margin, Math.min(maxY - margin, solY));
    solZ = Math.max(minZ + margin, Math.min(maxZ - margin, solZ));

    return [solX, solY, solZ];
  }
}

/**
 * Quantizes a 3D unit normal vector to 22.5° discrete increments (16-point compass azimuth,
 * and beveled polar bands). This creates the distinct crisp, faceted aesthetic (Enshrouded style)
 * while preserving low triangle counts.
 */
export function quantizeNormal22Point5(nx: number, ny: number, nz: number): [number, number, number] {
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-5) return [0, 1, 0];
  
  const x = nx / len;
  const y = ny / len;
  const z = nz / len;

  // Polar angle theta (angle with Y-axis up)
  const polar = Math.acos(Math.max(-1, Math.min(1, y)));
  // Azimuthal angle phi in X-Z plane
  const azimuth = Math.atan2(z, x);

  const stepRad = (NORMAL_QUANTIZATION_ANGLE_DEG * Math.PI) / 180; // 0.392699 rad

  // Quantize azimuth into 16 compass steps
  const quantAzimuth = Math.round(azimuth / stepRad) * stepRad;

  // Quantize polar angle into discrete slope tiers (flat top 0, slope 22.5°, 45°, 67.5°, vertical 90°, etc.)
  const quantPolar = Math.round(polar / stepRad) * stepRad;

  const sinP = Math.sin(quantPolar);
  const qx = sinP * Math.cos(quantAzimuth);
  const qy = Math.cos(quantPolar);
  const qz = sinP * Math.sin(quantAzimuth);

  const qLen = Math.hypot(qx, qy, qz);
  if (qLen < 1e-4) return [0, 1, 0];
  return [qx / qLen, qy / qLen, qz / qLen];
}
