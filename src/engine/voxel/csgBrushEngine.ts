/**
 * Analytical CSG Brush & SDF Evaluation Engine
 * 
 * Supports:
 * - Primitives: Sphere, Box (AABB/OBB), Cylinder, Capsule
 * - Operators: CSG Carve (Difference), CSG Add (Union), Smooth / Plateau
 * - Prop exclusion shielding: Protects ground beneath props unless blast exceeds durability
 * - Padded chunk density updates with int8 Hermite distances
 */

import {
  CSGBrushEvent,
  PropShield,
  VoxelChunkData,
  VOXEL_CHUNK_SIZE,
  VOXEL_PADDED_SIZE,
  VOXEL_SCALE,
  getPaddedIndex,
  floatToSdfInt8,
  sdfInt8ToFloat
} from './voxelTypes';

// Analytical Signed Distance Functions (SDF)

/**
 * Sphere SDF: d(p) = |p| - r
 */
export function sdfSphere(px: number, py: number, pz: number, radius: number): number {
  return Math.hypot(px, py, pz) - radius;
}

/**
 * Box SDF with half extents [hx, hy, hz]
 */
export function sdfBox(
  px: number, py: number, pz: number,
  hx: number, hy: number, hz: number
): number {
  const dx = Math.abs(px) - hx;
  const dy = Math.abs(py) - hy;
  const dz = Math.abs(pz) - hz;

  const outsideDist = Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
  const insideDist = Math.min(Math.max(dx, Math.max(dy, dz)), 0);
  return outsideDist + insideDist;
}

/**
 * Vertical Cylinder SDF with radius and half-height
 */
export function sdfCylinder(
  px: number, py: number, pz: number,
  radius: number, halfHeight: number
): number {
  const dHorizontal = Math.hypot(px, pz) - radius;
  const dVertical = Math.abs(py) - halfHeight;

  const outsideDist = Math.hypot(Math.max(dHorizontal, 0), Math.max(dVertical, 0));
  const insideDist = Math.min(Math.max(dHorizontal, dVertical), 0);
  return outsideDist + insideDist;
}

/**
 * Vertical Capsule SDF with radius and half-height
 */
export function sdfCapsule(
  px: number, py: number, pz: number,
  radius: number, halfHeight: number
): number {
  // Clamp p.y to [-halfHeight, halfHeight] line segment
  const clampedY = Math.max(-halfHeight, Math.min(halfHeight, py));
  return Math.hypot(px, py - clampedY, pz) - radius;
}

/**
 * Evaluates the SDF of a brush event at a given world-space position
 */
export function evaluateBrushSDF(brush: CSGBrushEvent, wx: number, wy: number, wz: number): number {
  // Translate to brush local space
  let lx = wx - brush.position[0];
  let ly = wy - brush.position[1];
  let lz = wz - brush.position[2];

  // Rotate if rotation Euler is provided
  if (brush.rotationEuler) {
    const [pitch, yaw, roll] = brush.rotationEuler;
    // Yaw (around Y)
    if (yaw !== 0) {
      const cosY = Math.cos(-yaw);
      const sinY = Math.sin(-yaw);
      const rx = lx * cosY - lz * sinY;
      const rz = lx * sinY + lz * cosY;
      lx = rx;
      lz = rz;
    }
    // Pitch (around X)
    if (pitch !== 0) {
      const cosP = Math.cos(-pitch);
      const sinP = Math.sin(-pitch);
      const ry = ly * cosP - lz * sinP;
      const rz = ly * sinP + lz * cosP;
      ly = ry;
      lz = rz;
    }
  }

  switch (brush.type) {
    case 'sphere':
      return sdfSphere(lx, ly, lz, brush.radius);
    case 'box': {
      const hx = brush.halfExtents ? brush.halfExtents[0] : brush.radius;
      const hy = brush.halfExtents ? brush.halfExtents[1] : brush.radius;
      const hz = brush.halfExtents ? brush.halfExtents[2] : brush.radius;
      return sdfBox(lx, ly, lz, hx, hy, hz);
    }
    case 'cylinder': {
      const hh = brush.height !== undefined ? brush.height * 0.5 : brush.radius;
      return sdfCylinder(lx, ly, lz, brush.radius, hh);
    }
    case 'capsule': {
      const hh = brush.height !== undefined ? brush.height * 0.5 : brush.radius;
      return sdfCapsule(lx, ly, lz, brush.radius, hh);
    }
    default:
      return sdfSphere(lx, ly, lz, brush.radius);
  }
}

/**
 * Computes world AABB bounds of a CSG brush for fast chunk rejection
 */
export function getBrushAABB(brush: CSGBrushEvent): { min: [number, number, number]; max: [number, number, number] } {
  let extent = brush.radius;
  if (brush.type === 'box' && brush.halfExtents) {
    extent = Math.max(brush.halfExtents[0], brush.halfExtents[1], brush.halfExtents[2]);
  } else if (brush.height !== undefined) {
    extent = Math.max(brush.radius, brush.height * 0.5 + brush.radius);
  }
  // Add margin for SDF transition falloff
  const margin = extent + 0.5;
  return {
    min: [brush.position[0] - margin, brush.position[1] - margin, brush.position[2] - margin],
    max: [brush.position[0] + margin, brush.position[1] + margin, brush.position[2] + margin],
  };
}

/**
 * Checks if a world position is protected by any active prop shield
 */
export function isPositionShielded(
  wx: number, wy: number, wz: number,
  shields: PropShield[],
  damage: number = 50
): boolean {
  for (let i = 0; i < shields.length; i++) {
    const s = shields[i];
    if (!s.active) continue;
    if (damage >= s.durability) continue; // Blast overpowered shield!

    const dist = Math.hypot(wx - s.position[0], wy - s.position[1], wz - s.position[2]);
    if (dist <= s.radius) {
      return true; // Shielded!
    }
  }
  return false;
}

/**
 * Applies a CSG brush stamp to a chunk's padded density buffer
 * Returns true if any voxel inside the chunk was modified
 */
export function applyBrushToChunk(
  chunk: VoxelChunkData,
  brush: CSGBrushEvent,
  shields: PropShield[] = []
): boolean {
  let modified = false;
  const chunkOriginX = chunk.cx * VOXEL_CHUNK_SIZE * VOXEL_SCALE;
  const chunkOriginY = chunk.cy * VOXEL_CHUNK_SIZE * VOXEL_SCALE;
  const chunkOriginZ = chunk.cz * VOXEL_CHUNK_SIZE * VOXEL_SCALE;

  const matId = brush.materialId !== undefined ? brush.materialId : 1;
  const damage = brush.damage !== undefined ? brush.damage : 50;

  // Loop through all padded cells (18x18x18)
  for (let pz = 0; pz < VOXEL_PADDED_SIZE; pz++) {
    // Cell coordinate in chunk local space (-1 .. 16)
    const lz = pz - 1;
    const wz = chunkOriginZ + lz * VOXEL_SCALE;

    for (let py = 0; py < VOXEL_PADDED_SIZE; py++) {
      const ly = py - 1;
      const wy = chunkOriginY + ly * VOXEL_SCALE;

      for (let px = 0; px < VOXEL_PADDED_SIZE; px++) {
        const lx = px - 1;
        const wx = chunkOriginX + lx * VOXEL_SCALE;

        // Prop Shielding Check: ignore carving if protected by active prop
        if (brush.operation === 'carve' && shields.length > 0) {
          if (isPositionShielded(wx, wy, wz, shields, damage)) {
            continue;
          }
        }

        const brushDist = evaluateBrushSDF(brush, wx, wy, wz);

        const idx = getPaddedIndex(px, py, pz);
        const currentDist = sdfInt8ToFloat(chunk.densities[idx]);

        let newDist = currentDist;

        if (brush.operation === 'carve') {
          // CSG Difference: max(current, -brush)
          // brushDist < 0 inside brush -> -brushDist > 0 -> pushes density positive (AIR)
          newDist = Math.max(currentDist, -brushDist);
        } else if (brush.operation === 'add') {
          // CSG Union: min(current, brush)
          // brushDist < 0 inside brush -> pulls density negative (SOLID)
          newDist = Math.min(currentDist, brushDist);
          if (newDist < 0) {
            chunk.materials[idx] = matId;
          }
        } else if (brush.operation === 'smooth') {
          // Smooth blend towards average when within brush radius
          if (brushDist < 0) {
            const blendFactor = Math.min(1.0, -brushDist / brush.radius);
            // Relax towards zero
            newDist = currentDist * (1.0 - blendFactor * 0.5);
          }
        }

        const newInt8 = floatToSdfInt8(newDist);
        if (newInt8 !== chunk.densities[idx]) {
          chunk.densities[idx] = newInt8;
          modified = true;
        }
      }
    }
  }

  if (modified) {
    chunk.isDirty = true;
  }
  return modified;
}
