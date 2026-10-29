/**
 * Feature-Preserving Surface Nets Isosurface Extractor
 * 
 * Features:
 * - Solves QEF (Quadratic Error Function) for sharp edge preservation and bevels
 * - Quantizes normals to 22.5° increments (16-point compass) for stylized Enshrouded look
 * - Watertight boundary skirts (1.0-1.5 voxel downward extrusion)
 * - Returns typed arrays for zero-copy upload to GPU / Three.js
 */

import {
  VOXEL_CHUNK_SIZE,
  VOXEL_PADDED_SIZE,
  VOXEL_SCALE,
  VoxelChunkData,
  VoxelMesh,
  getPaddedIndex,
  sdfInt8ToFloat
} from './voxelTypes';
import { QEFSolver3D, quantizeNormal22Point5 } from './qefSolver';

// 8 corner offsets in cell: [dx, dy, dz]
const CORNER_OFFSETS: [number, number, number][] = [
  [0, 0, 0], // 0
  [1, 0, 0], // 1
  [0, 1, 0], // 2
  [1, 1, 0], // 3
  [0, 0, 1], // 4
  [1, 0, 1], // 5
  [0, 1, 1], // 6
  [1, 1, 1], // 7
];

// 12 edges of a cube: pairs of corner indices
const CUBE_EDGES: [number, number][] = [
  [0, 1], [2, 3], [4, 5], [6, 7], // parallel to X
  [0, 2], [1, 3], [4, 6], [5, 7], // parallel to Y
  [0, 4], [1, 5], [2, 6], [3, 7], // parallel to Z
];

export interface SurfaceNetsOptions {
  quantizeNormals?: boolean;
  generateSkirts?: boolean;
  skirtDepthVoxels?: number; // default 1.25 voxels
}

export class SurfaceNetsExtractor {
  private qefSolver = new QEFSolver3D();

  // Scratchpad for storing vertex index per cell (16x16x16)
  private cellVertexMap = new Int32Array(VOXEL_CHUNK_SIZE * VOXEL_CHUNK_SIZE * VOXEL_CHUNK_SIZE);

  /**
   * Samples trilinear gradient from padded SDF buffer to obtain surface normal
   */
  private sampleGradient(
    densities: Int8Array,
    px: number, py: number, pz: number
  ): [number, number, number] {
    const x0 = Math.max(0, px - 1);
    const x1 = Math.min(VOXEL_PADDED_SIZE - 1, px + 1);
    const y0 = Math.max(0, py - 1);
    const y1 = Math.min(VOXEL_PADDED_SIZE - 1, py + 1);
    const z0 = Math.max(0, pz - 1);
    const z1 = Math.min(VOXEL_PADDED_SIZE - 1, pz + 1);

    const dx = sdfInt8ToFloat(densities[getPaddedIndex(x1, py, pz)]) -
               sdfInt8ToFloat(densities[getPaddedIndex(x0, py, pz)]);
    const dy = sdfInt8ToFloat(densities[getPaddedIndex(px, y1, pz)]) -
               sdfInt8ToFloat(densities[getPaddedIndex(px, y0, pz)]);
    const dz = sdfInt8ToFloat(densities[getPaddedIndex(px, py, z1)]) -
               sdfInt8ToFloat(densities[getPaddedIndex(px, py, z0)]);

    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return [0, 1, 0];
    return [dx / len, dy / len, dz / len];
  }

  /**
   * Extracts a polygon mesh from a voxel chunk's padded Hermite SDF buffer
   */
  public extractMesh(chunk: VoxelChunkData, options: SurfaceNetsOptions = {}): VoxelMesh {
    const quantizeNormals = options.quantizeNormals !== false;
    const generateSkirts = options.generateSkirts !== false;
    const skirtDepth = (options.skirtDepthVoxels ?? 1.25) * VOXEL_SCALE;

    const chunkOriginX = chunk.cx * VOXEL_CHUNK_SIZE * VOXEL_SCALE;
    const chunkOriginY = chunk.cy * VOXEL_CHUNK_SIZE * VOXEL_SCALE;
    const chunkOriginZ = chunk.cz * VOXEL_CHUNK_SIZE * VOXEL_SCALE;

    this.cellVertexMap.fill(-1);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const materialIds: number[] = [];
    const indices: number[] = [];

    // Map: cell coordinate -> vertex index
    const getCellKey = (x: number, y: number, z: number) => {
      return x + y * VOXEL_CHUNK_SIZE + z * VOXEL_CHUNK_SIZE * VOXEL_CHUNK_SIZE;
    };

    // Step 1: Vertex Extraction for every cell exhibiting a sign change
    for (let cz = 0; cz < VOXEL_CHUNK_SIZE; cz++) {
      const pz = cz + 1; // 1-cell border offset
      for (let cy = 0; cy < VOXEL_CHUNK_SIZE; cy++) {
        const py = cy + 1;
        for (let cx = 0; cx < VOXEL_CHUNK_SIZE; cx++) {
          const px = cx + 1;

          // Gather 8 corner densities
          let mask = 0;
          const cornerDist: number[] = new Array(8);
          for (let i = 0; i < 8; i++) {
            const [dx, dy, dz] = CORNER_OFFSETS[i];
            const cIdx = getPaddedIndex(px + dx, py + dy, pz + dz);
            const d = sdfInt8ToFloat(chunk.densities[cIdx]);
            cornerDist[i] = d;
            if (d < 0) {
              mask |= (1 << i);
            }
          }

          // If all corners are inside (mask == 255) or all outside (mask == 0), no surface here
          if (mask === 0 || mask === 255) {
            continue;
          }

          // QEF plane accumulation for edge crossings
          this.qefSolver.reset();
          let avgNx = 0;
          let avgNy = 0;
          let avgNz = 0;
          let dominantMatId = 1;

          for (let e = 0; e < 12; e++) {
            const [c0, c1] = CUBE_EDGES[e];
            const d0 = cornerDist[c0];
            const d1 = cornerDist[c1];

            // Sign change along edge
            if ((d0 < 0 && d1 >= 0) || (d0 >= 0 && d1 < 0)) {
              const t = Math.abs(d0) / (Math.abs(d0) + Math.abs(d1) + 1e-6);
              const [ox0, oy0, oz0] = CORNER_OFFSETS[c0];
              const [ox1, oy1, oz1] = CORNER_OFFSETS[c1];

              // Local position inside cell [0..1]
              const ix = ox0 + t * (ox1 - ox0);
              const iy = oy0 + t * (oy1 - oy0);
              const iz = oz0 + t * (oz1 - oz0);

              // World coordinate of crossing
              const wx = chunkOriginX + (cx + ix) * VOXEL_SCALE;
              const wy = chunkOriginY + (cy + iy) * VOXEL_SCALE;
              const wz = chunkOriginZ + (cz + iz) * VOXEL_SCALE;

              // Sample normal at edge intersection
              const [nx, ny, nz] = this.sampleGradient(chunk.densities, px + ix, py + iy, pz + iz);
              this.qefSolver.addPlane(wx, wy, wz, nx, ny, nz);

              avgNx += nx;
              avgNy += ny;
              avgNz += nz;

              // Material of solid corner
              const solidCorner = d0 < 0 ? c0 : c1;
              const [sx, sy, sz] = CORNER_OFFSETS[solidCorner];
              const sPaddedIdx = getPaddedIndex(px + sx, py + sy, pz + sz);
              dominantMatId = chunk.materials[sPaddedIdx] || dominantMatId;
            }
          }

          // Cell bounds in world space
          const cellMinX = chunkOriginX + cx * VOXEL_SCALE;
          const cellMinY = chunkOriginY + cy * VOXEL_SCALE;
          const cellMinZ = chunkOriginZ + cz * VOXEL_SCALE;
          const cellMaxX = cellMinX + VOXEL_SCALE;
          const cellMaxY = cellMinY + VOXEL_SCALE;
          const cellMaxZ = cellMinZ + VOXEL_SCALE;

          // Solve QEF clamped within this voxel cell
          const [vX, vY, vZ] = this.qefSolver.solve(
            cellMinX, cellMinY, cellMinZ,
            cellMaxX, cellMaxY, cellMaxZ
          );

          // Normalize accumulated normal
          const nLen = Math.hypot(avgNx, avgNy, avgNz);
          let norm: [number, number, number] = nLen > 1e-4
            ? [avgNx / nLen, avgNy / nLen, avgNz / nLen]
            : [0, 1, 0];

          // 22.5° Normal vector snapping for faceted Enshrouded aesthetic
          if (quantizeNormals) {
            norm = quantizeNormal22Point5(norm[0], norm[1], norm[2]);
          }

          const vertIndex = positions.length / 3;
          this.cellVertexMap[getCellKey(cx, cy, cz)] = vertIndex;

          positions.push(vX, vY, vZ);
          normals.push(norm[0], norm[1], norm[2]);
          // UV from world coordinates
          uvs.push(vX * 0.5, vZ * 0.5);
          materialIds.push(dominantMatId);
        }
      }
    }

    // Step 2: Polygon Quad Generation along primary grid axes (X, Y, Z)
    for (let cz = 0; cz < VOXEL_CHUNK_SIZE; cz++) {
      const pz = cz + 1;
      for (let cy = 0; cy < VOXEL_CHUNK_SIZE; cy++) {
        const py = cy + 1;
        for (let cx = 0; cx < VOXEL_CHUNK_SIZE; cx++) {
          const px = cx + 1;

          const d000 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(px, py, pz)]);

          // --- X-Axis Edge: between (cx, cy, cz) and (cx+1, cy, cz) ---
          if (cx < VOXEL_CHUNK_SIZE - 1 && cy > 0 && cz > 0) {
            const d100 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(px + 1, py, pz)]);
            if ((d000 < 0 && d100 >= 0) || (d000 >= 0 && d100 < 0)) {
              const v0 = this.cellVertexMap[getCellKey(cx, cy, cz)];
              const v1 = this.cellVertexMap[getCellKey(cx, cy - 1, cz)];
              const v2 = this.cellVertexMap[getCellKey(cx, cy - 1, cz - 1)];
              const v3 = this.cellVertexMap[getCellKey(cx, cy, cz - 1)];

              if (v0 >= 0 && v1 >= 0 && v2 >= 0 && v3 >= 0) {
                if (d000 < 0) {
                  indices.push(v0, v1, v2);
                  indices.push(v0, v2, v3);
                } else {
                  indices.push(v0, v2, v1);
                  indices.push(v0, v3, v2);
                }
              }
            }
          }

          // --- Y-Axis Edge: between (cx, cy, cz) and (cx, cy+1, cz) ---
          if (cy < VOXEL_CHUNK_SIZE - 1 && cx > 0 && cz > 0) {
            const d010 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(px, py + 1, pz)]);
            if ((d000 < 0 && d010 >= 0) || (d000 >= 0 && d010 < 0)) {
              const v0 = this.cellVertexMap[getCellKey(cx, cy, cz)];
              const v1 = this.cellVertexMap[getCellKey(cx - 1, cy, cz)];
              const v2 = this.cellVertexMap[getCellKey(cx - 1, cy, cz - 1)];
              const v3 = this.cellVertexMap[getCellKey(cx, cy, cz - 1)];

              if (v0 >= 0 && v1 >= 0 && v2 >= 0 && v3 >= 0) {
                if (d000 < 0) {
                  indices.push(v0, v2, v1);
                  indices.push(v0, v3, v2);
                } else {
                  indices.push(v0, v1, v2);
                  indices.push(v0, v2, v3);
                }
              }
            }
          }

          // --- Z-Axis Edge: between (cx, cy, cz) and (cx, cy, cz+1) ---
          if (cz < VOXEL_CHUNK_SIZE - 1 && cx > 0 && cy > 0) {
            const d001 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(px, py, pz + 1)]);
            if ((d000 < 0 && d001 >= 0) || (d000 >= 0 && d001 < 0)) {
              const v0 = this.cellVertexMap[getCellKey(cx, cy, cz)];
              const v1 = this.cellVertexMap[getCellKey(cx - 1, cy, cz)];
              const v2 = this.cellVertexMap[getCellKey(cx - 1, cy - 1, cz)];
              const v3 = this.cellVertexMap[getCellKey(cx, cy - 1, cz)];

              if (v0 >= 0 && v1 >= 0 && v2 >= 0 && v3 >= 0) {
                if (d000 < 0) {
                  indices.push(v0, v1, v2);
                  indices.push(v0, v2, v3);
                } else {
                  indices.push(v0, v2, v1);
                  indices.push(v0, v3, v2);
                }
              }
            }
          }
        }
      }
    }

    // Step 3: Seam Boundary Skirt Generation (extrude boundary vertices downwards)
    if (generateSkirts && positions.length > 0) {
      this.appendBoundarySkirts(
        positions, normals, uvs, materialIds, indices,
        chunkOriginX, chunkOriginY, chunkOriginZ,
        skirtDepth
      );
    }

    // Compute bounding box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      materialIds: new Float32Array(materialIds),
      indices: new Uint32Array(indices),
      vertexCount: positions.length / 3,
      triangleCount: indices.length / 3,
      bounds: {
        min: [minX === Infinity ? 0 : minX, minY === Infinity ? 0 : minY, minZ === Infinity ? 0 : minZ],
        max: [maxX === -Infinity ? 0 : maxX, maxY === -Infinity ? 0 : maxY, maxZ === -Infinity ? 0 : maxZ]
      }
    };
  }

  /**
   * Generates downward skirts for chunk boundary vertices to seal T-junction gaps
   */
  private appendBoundarySkirts(
    positions: number[],
    normals: number[],
    uvs: number[],
    materialIds: number[],
    indices: number[],
    chunkOriginX: number,
    chunkOriginY: number,
    chunkOriginZ: number,
    skirtDepth: number
  ): void {
    const chunkMinX = chunkOriginX;
    const chunkMaxX = chunkOriginX + VOXEL_CHUNK_SIZE * VOXEL_SCALE;
    const chunkMinZ = chunkOriginZ;
    const chunkMaxZ = chunkOriginZ + VOXEL_CHUNK_SIZE * VOXEL_SCALE;

    const threshold = VOXEL_SCALE * 0.95;
    const boundaryVerts: number[] = [];

    const numBaseVerts = positions.length / 3;
    for (let i = 0; i < numBaseVerts; i++) {
      const vx = positions[i * 3];
      const vy = positions[i * 3 + 1];
      const vz = positions[i * 3 + 2];

      const isBorder = (
        Math.abs(vx - chunkMinX) < threshold ||
        Math.abs(vx - chunkMaxX) < threshold ||
        Math.abs(vz - chunkMinZ) < threshold ||
        Math.abs(vz - chunkMaxZ) < threshold
      );

      // Only create skirts for upwards-facing terrain edges
      const ny = normals[i * 3 + 1];
      if (isBorder && ny > 0.1) {
        boundaryVerts.push(i);
      }
    }

    // For boundary vertices, create extruded skirt vertices
    // Map original index -> skirt vertex index
    const skirtVertMap = new Map<number, number>();
    for (const vIdx of boundaryVerts) {
      const vx = positions[vIdx * 3];
      const vy = positions[vIdx * 3 + 1] - skirtDepth;
      const vz = positions[vIdx * 3 + 2];

      const skirtIdx = positions.length / 3;
      skirtVertMap.set(vIdx, skirtIdx);

      positions.push(vx, vy, vz);
      // Skirts inherit horizontal/outward normal
      normals.push(normals[vIdx * 3], 0, normals[vIdx * 3 + 2]);
      uvs.push(uvs[vIdx * 2], uvs[vIdx * 2 + 1]);
      materialIds.push(materialIds[vIdx]);
    }

    // Connect boundary edges with skirt quads
    const baseIndexCount = indices.length;
    const boundaryEdges = new Map<string, { a: number; b: number; sA: number; sB: number; count: number }>();

    for (let t = 0; t < baseIndexCount; t += 3) {
      const tri = [indices[t], indices[t + 1], indices[t + 2]];
      for (let e = 0; e < 3; e++) {
        const a = tri[e];
        const b = tri[(e + 1) % 3];

        if (skirtVertMap.has(a) && skirtVertMap.has(b)) {
          const sA = skirtVertMap.get(a)!;
          const sB = skirtVertMap.get(b)!;
          const edgeKey = a < b ? `${a}_${b}` : `${b}_${a}`;

          const existing = boundaryEdges.get(edgeKey);
          if (existing) {
            existing.count++;
          } else {
            boundaryEdges.set(edgeKey, { a, b, sA, sB, count: 1 });
          }
        }
      }
    }

    // Only emit skirt quads for edges on the true boundary silhouette (count === 1)
    for (const edge of boundaryEdges.values()) {
      if (edge.count === 1) {
        indices.push(edge.a, edge.sA, edge.b);
        indices.push(edge.b, edge.sA, edge.sB);
      }
    }
  }
}
