/**
 * Core Types & Constants for the Drop-In Voxel Engine
 * Specification:
 * - 0.25m base cell size (LOD 0)
 * - 16x16x16 active cells per chunk
 * - 18x18x18 padded Hermite SDF density buffers (int8_t distances: -128..127)
 * - Feature-Preserving Surface Nets with QEF edge solving
 * - 22.5° normal quantization (16-point compass)
 * - Boundary skirts for watertight LOD transitions
 */

export const VOXEL_CHUNK_SIZE = 16;
export const VOXEL_PADDED_SIZE = 18; // 1-cell border on all sides: [-1..16]
export const VOXEL_SCALE = 0.25; // 0.25 meters per cell
export const SDF_INT8_MAX_DISTANCE = 4.0; // Distance mapped to 127 in int8
export const NORMAL_QUANTIZATION_ANGLE_DEG = 22.5; // 16 compass steps: 360 / 16

// Spec Aliases
export const BASE_CELL_SIZE = VOXEL_SCALE;
export const CHUNK_ACTIVE_CELLS = VOXEL_CHUNK_SIZE;
export const CHUNK_PADDING = 1;
export const CHUNK_TOTAL_SAMPLES = VOXEL_PADDED_SIZE * VOXEL_PADDED_SIZE * VOXEL_PADDED_SIZE;
export const NORMAL_SNAP_INTERVAL = NORMAL_QUANTIZATION_ANGLE_DEG;
export type VoxelChunk = VoxelChunkData;

export type CSGBrushType = 'sphere' | 'box' | 'cylinder' | 'capsule';
export type CSGOperation = 'carve' | 'add' | 'smooth' | 'paint';

export interface VoxelCoord3D {
  x: number;
  y: number;
  z: number;
}

export interface ChunkKey {
  cx: number;
  cy: number;
  cz: number;
}

export interface CSGBrushEvent {
  id: string;
  type: CSGBrushType;
  operation: CSGOperation;
  position: [number, number, number]; // World space (meters)
  radius: number; // For sphere, cylinder, capsule
  halfExtents?: [number, number, number]; // For box [hx, hy, hz]
  height?: number; // For cylinder, capsule
  rotationEuler?: [number, number, number]; // Optional pitch/yaw/roll
  materialId?: number; // 0=Air, 1=Stone, 2=Dirt, 3=Grass, 4=Basalt, 5=Sand, 6=Snow
  damage?: number;
}

export interface PropShield {
  id: string;
  position: [number, number, number];
  radius: number;
  durability: number;
  active: boolean;
}

export interface VoxelVertex {
  position: [number, number, number];
  normal: [number, number, number];
  uv: [number, number];
  materialId: number;
  isSkirt?: boolean;
}

export interface VoxelMesh {
  positions: Float32Array; // [x, y, z, ...]
  normals: Float32Array;   // [nx, ny, nz, ...]
  uvs: Float32Array;       // [u, v, ...]
  materialIds: Float32Array; // [matId, ...]
  indices: Uint32Array;    // Triangles
  vertexCount: number;
  triangleCount: number;
  skirtTriangleCount?: number;
  skirtVertexCount?: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface VoxelChunkData {
  cx: number;
  cy: number;
  cz: number;
  lod: number; // 0 = 0.25m, 1 = 0.5m, 2 = 1.0m, 3 = 2.0m
  /**
   * Padded density buffer (18x18x18 = 5,832 bytes).
   * Values: signed int8 (-128..127). Negative is INSIDE solid, positive is OUTSIDE air.
   */
  densities: Int8Array;
  /**
   * Material assignment per cell (18x18x18 = 5,832 bytes).
   */
  materials: Uint8Array;
  isDirty: boolean;
  mesh?: VoxelMesh;
}

export function chunkCoordToKey(cx: number, cy: number, cz: number): string {
  return `${cx}_${cy}_${cz}`;
}

export function keyToChunkCoord(key: string): ChunkKey {
  const [cx, cy, cz] = key.split('_').map(Number);
  return { cx, cy, cz };
}

/**
 * Maps 3D padded index (0..17, 0..17, 0..17) to linear offset in 18³ array
 */
export function getPaddedIndex(x: number, y: number, z: number): number {
  return x + y * VOXEL_PADDED_SIZE + z * VOXEL_PADDED_SIZE * VOXEL_PADDED_SIZE;
}

/**
 * Converts float distance to signed int8 (-128 to 127)
 */
export function floatToSdfInt8(dist: number): number {
  const normalized = Math.max(-1, Math.min(1, dist / SDF_INT8_MAX_DISTANCE));
  return Math.round(normalized * 127);
}

/**
 * Converts signed int8 to float distance
 */
export function sdfInt8ToFloat(val: number): number {
  return (val / 127) * SDF_INT8_MAX_DISTANCE;
}
