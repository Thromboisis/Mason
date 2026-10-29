/**
 * Voxel World Manager
 * 
 * Coordinates:
 * - Chunk storage and lifecycle
 * - Procedural terrain generation with cliffs, arches, and smooth Enshrouded caves
 * - CSG brush stamp dispatch and dirty chunk tracking
 * - Hermite SDF trilinear queries for player capsule collision
 * - Raycasting through Hermite SDF for interactive carving/building
 * - Prop exclusion shields
 */

import {
  VoxelChunkData,
  VoxelMesh,
  CSGBrushEvent,
  PropShield,
  VOXEL_CHUNK_SIZE,
  VOXEL_PADDED_SIZE,
  VOXEL_SCALE,
  chunkCoordToKey,
  getPaddedIndex,
  floatToSdfInt8,
  sdfInt8ToFloat
} from './voxelTypes';
import { SurfaceNetsExtractor, SurfaceNetsOptions } from './surfaceNetsExtractor';
import { applyBrushToChunk, getBrushAABB } from './csgBrushEngine';
import { voxelWasmBridge } from './wasmBridge';

// Simplex-style fast pseudo-noise for procedural landscape and 3D caves
function hash(x: number, y: number, z: number): number {
  let h = x * 374761393 + y * 668265263 + z * 3266489917;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function valueNoise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  // Smoothstep interpolation
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);

  const c000 = hash(ix, iy, iz);
  const c100 = hash(ix + 1, iy, iz);
  const c010 = hash(ix, iy + 1, iz);
  const c110 = hash(ix + 1, iy + 1, iz);
  const c001 = hash(ix, iy, iz + 1);
  const c101 = hash(ix + 1, iy, iz + 1);
  const c011 = hash(ix, iy + 1, iz + 1);
  const c111 = hash(ix + 1, iy + 1, iz + 1);

  const x00 = c000 * (1 - u) + c100 * u;
  const x10 = c010 * (1 - u) + c110 * u;
  const x01 = c001 * (1 - u) + c101 * u;
  const x11 = c011 * (1 - u) + c111 * u;

  const y0 = x00 * (1 - v) + x10 * v;
  const y1 = x01 * (1 - v) + x11 * v;

  return y0 * (1 - w) + y1 * w;
}

function fbm3D(x: number, y: number, z: number, octaves = 3): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise3D(x * frequency, y * frequency, z * frequency) * amplitude;
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return total / maxVal;
}

export class VoxelWorld {
  private chunks = new Map<string, VoxelChunkData>();
  private extractor = new SurfaceNetsExtractor();
  private propShields: PropShield[] = [];

  public quantizeNormals = true;
  public generateSkirts = true;
  public skirtDepthVoxels = 1.25;
  public useWasm = true;

  constructor() {
    voxelWasmBridge.init();
  }

  public clear(): void {
    this.chunks.clear();
    this.propShields = [];
  }

  public getChunk(cx: number, cy: number, cz: number): VoxelChunkData | undefined {
    return this.chunks.get(chunkCoordToKey(cx, cy, cz));
  }

  public getAllChunks(): VoxelChunkData[] {
    return Array.from(this.chunks.values());
  }

  public getOrCreateChunk(cx: number, cy: number, cz: number, lod = 0): VoxelChunkData {
    const key = chunkCoordToKey(cx, cy, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      const bufferSize = VOXEL_PADDED_SIZE * VOXEL_PADDED_SIZE * VOXEL_PADDED_SIZE;
      chunk = {
        cx,
        cy,
        cz,
        lod,
        densities: new Int8Array(bufferSize),
        materials: new Uint8Array(bufferSize),
        isDirty: true
      };
      // Default to air (+1.0 distance)
      chunk.densities.fill(floatToSdfInt8(2.0));
      chunk.materials.fill(0);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  public registerShield(shield: PropShield): void {
    this.propShields.push(shield);
  }

  public removeShield(id: string): void {
    this.propShields = this.propShields.filter(s => s.id !== id);
  }

  public clearShields(): void {
    this.propShields = [];
  }

  public getShields(): PropShield[] {
    return this.propShields;
  }

  public getAllChunksMap(): Map<string, VoxelChunkData> {
    return this.chunks;
  }

  /**
   * Initializes a procedural voxel landscape with rolling hills, rock overhangs,
   * and smooth underground caves within specified chunk extents.
   */
  public generateLandscape(
    minChunkX = -3, maxChunkX = 3,
    minChunkY = -2, maxChunkY = 2,
    minChunkZ = -3, maxChunkZ = 3
  ): void {
    for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
      for (let cy = minChunkY; cy <= maxChunkY; cy++) {
        for (let cx = minChunkX; cx <= maxChunkX; cx++) {
          const chunk = this.getOrCreateChunk(cx, cy, cz);
          this.generateChunkTerrainSDF(chunk);
        }
      }
    }

    // Remesh all initialized chunks
    this.remeshAllDirtyChunks();
  }

  /**
   * Evaluates procedural SDF for a chunk: base terrain + 3D cave tunnels
   */
  private generateChunkTerrainSDF(chunk: VoxelChunkData): void {
    if (this.useWasm && voxelWasmBridge.isReady()) {
      const ok = voxelWasmBridge.generateProceduralTerrain(chunk);
      if (ok) return;
    }

    const chunkOriginX = chunk.cx * VOXEL_CHUNK_SIZE * VOXEL_SCALE;
    const chunkOriginY = chunk.cy * VOXEL_CHUNK_SIZE * VOXEL_SCALE;
    const chunkOriginZ = chunk.cz * VOXEL_CHUNK_SIZE * VOXEL_SCALE;

    for (let pz = 0; pz < VOXEL_PADDED_SIZE; pz++) {
      const wz = chunkOriginZ + (pz - 1) * VOXEL_SCALE;
      for (let py = 0; py < VOXEL_PADDED_SIZE; py++) {
        const wy = chunkOriginY + (py - 1) * VOXEL_SCALE;
        for (let px = 0; px < VOXEL_PADDED_SIZE; px++) {
          const wx = chunkOriginX + (px - 1) * VOXEL_SCALE;

          // 1. Base rolling hills heightfield
          const hillNoise = fbm3D(wx * 0.04, 0.2, wz * 0.04, 3);
          const mountainNoise = Math.pow(fbm3D(wx * 0.02, 0.5, wz * 0.02, 2), 1.6);
          const groundHeight = -1.0 + hillNoise * 4.0 + mountainNoise * 7.0;

          // Vertical signed distance to ground surface
          let sdf = wy - groundHeight;

          // 2. 3D Overhangs & Crags (3D noise adding mass)
          const crag = (fbm3D(wx * 0.08, wy * 0.08, wz * 0.08, 2) - 0.5) * 2.5;
          sdf += crag * 0.4;

          // 3. 3D Cave Networks (Worm-like tunnels subterranean)
          if (wy < groundHeight + 1.0) {
            const cave1 = fbm3D(wx * 0.07 + 10.0, wy * 0.09, wz * 0.07 + 5.0, 2);
            const cave2 = fbm3D(wx * 0.07 - 20.0, wy * 0.09 + 3.0, wz * 0.07 - 12.0, 2);
            const caveVal = cave1 * cave1 + cave2 * cave2;
            // Carve hollow pipe if caveVal < threshold
            if (caveVal < 0.12 && wy < groundHeight - 1.5) {
              const caveDistance = (caveVal - 0.12) * 8.0;
              // Carve by taking max(sdf, -caveDistance)
              sdf = Math.max(sdf, -caveDistance);
            }
          }

          const idx = getPaddedIndex(px, py, pz);
          chunk.densities[idx] = floatToSdfInt8(sdf);

          // Assign material based on elevation and slope
          if (sdf < 0) {
            if (wy > 5.5) {
              chunk.materials[idx] = 6; // Snow
            } else if (wy > 2.0 && crag > 0.2) {
              chunk.materials[idx] = 4; // Basalt / Rock
            } else if (wy < -2.0) {
              chunk.materials[idx] = 1; // Stone
            } else {
              chunk.materials[idx] = 3; // Grass / Topsoil
            }
          } else {
            chunk.materials[idx] = 0; // Air
          }
        }
      }
    }

    chunk.isDirty = true;
  }

  /**
   * Applies an analytical CSG brush to the world
   * Returns list of modified chunk keys
   */
  public applyCSGBrush(event: CSGBrushEvent): string[] {
    const aabb = getBrushAABB(event);
    const minCx = Math.floor(aabb.min[0] / (VOXEL_CHUNK_SIZE * VOXEL_SCALE));
    const maxCx = Math.floor(aabb.max[0] / (VOXEL_CHUNK_SIZE * VOXEL_SCALE));
    const minCy = Math.floor(aabb.min[1] / (VOXEL_CHUNK_SIZE * VOXEL_SCALE));
    const maxCy = Math.floor(aabb.max[1] / (VOXEL_CHUNK_SIZE * VOXEL_SCALE));
    const minCz = Math.floor(aabb.min[2] / (VOXEL_CHUNK_SIZE * VOXEL_SCALE));
    const maxCz = Math.floor(aabb.max[2] / (VOXEL_CHUNK_SIZE * VOXEL_SCALE));

    const modifiedKeys: string[] = [];

    for (let cz = minCz; cz <= maxCz; cz++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          const chunk = this.getOrCreateChunk(cx, cy, cz);
          const changed = applyBrushToChunk(chunk, event, this.propShields);
          if (changed) {
            modifiedKeys.push(chunkCoordToKey(cx, cy, cz));
          }
        }
      }
    }

    // Remesh modified chunks immediately
    for (const key of modifiedKeys) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        this.remeshChunk(chunk);
      }
    }

    return modifiedKeys;
  }

  /**
   * Remeshes a single chunk with current Surface Nets settings
   */
  public remeshChunk(chunk: VoxelChunkData): VoxelMesh {
    const opts = {
      lod: chunk.lod ?? 0,
      quantizeNormals: this.quantizeNormals,
      generateSkirts: this.generateSkirts,
      skirtDepthVoxels: this.skirtDepthVoxels
    };
    let mesh: VoxelMesh;
    if (this.useWasm && voxelWasmBridge.isReady()) {
      mesh = voxelWasmBridge.extractMesh(chunk, opts);
    } else {
      mesh = this.extractor.extractMesh(chunk, opts);
    }
    chunk.mesh = mesh;
    chunk.isDirty = false;
    return mesh;
  }

  /**
   * Evaluates Cascaded Distance LODs for all chunks relative to camera position
   * Thresholds (per Engine Spec):
   * - LOD 0: 0.25m cell size, 0–24m
   * - LOD 1: 0.50m cell size, 24–64m
   * - LOD 2: 1.00m cell size, 64–150m
   * - LOD 3: 2.00m cell size, 150m+
   * Returns keys of chunks whose LOD changed and were remeshed
   */
  public updateCascadedLODs(cameraPos: { x: number; y: number; z: number }): string[] {
    const changedKeys: string[] = [];
    const csMeters = VOXEL_CHUNK_SIZE * VOXEL_SCALE;

    for (const [key, chunk] of this.chunks.entries()) {
      const chunkCenterX = (chunk.cx + 0.5) * csMeters;
      const chunkCenterY = (chunk.cy + 0.5) * csMeters;
      const chunkCenterZ = (chunk.cz + 0.5) * csMeters;

      const dist = Math.hypot(
        cameraPos.x - chunkCenterX,
        cameraPos.y - chunkCenterY,
        cameraPos.z - chunkCenterZ
      );

      let targetLod = 0;
      if (dist > 150.0) targetLod = 3;
      else if (dist > 64.0) targetLod = 2;
      else if (dist > 24.0) targetLod = 1;

      if (chunk.lod !== targetLod) {
        chunk.lod = targetLod;
        this.remeshChunk(chunk);
        changedKeys.push(key);
      }
    }

    return changedKeys;
  }

  /**
   * Remeshes all chunks that have been modified
   */
  public remeshAllDirtyChunks(): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.isDirty) {
        this.remeshChunk(chunk);
      }
    }
  }

  /**
   * Unconditionally remeshes all loaded chunks (e.g. after toggling skirts or normal quantization)
   */
  public remeshAllChunks(): void {
    for (const chunk of this.chunks.values()) {
      this.remeshChunk(chunk);
    }
  }

  /**
   * Trilinear Hermite SDF lookup at any world space position
   * Used for player capsule ground resolution, raycasts, and physics
   * Negative = inside solid, Positive = outside air
   */
  public querySDF(wx: number, wy: number, wz: number): number {
    const csMeters = VOXEL_CHUNK_SIZE * VOXEL_SCALE;
    const cx = Math.floor(wx / csMeters);
    const cy = Math.floor(wy / csMeters);
    const cz = Math.floor(wz / csMeters);

    const chunk = this.getChunk(cx, cy, cz);
    if (!chunk) return 2.0; // Air outside known chunks

    // Position within chunk in voxels
    const lx = (wx - cx * csMeters) / VOXEL_SCALE;
    const ly = (wy - cy * csMeters) / VOXEL_SCALE;
    const lz = (wz - cz * csMeters) / VOXEL_SCALE;

    if (this.useWasm && voxelWasmBridge.isReady()) {
      return voxelWasmBridge.queryTrilinearSDF(chunk, lx, ly, lz);
    }

    // In padded array, 0 is at offset 1
    const px = lx + 1;
    const py = ly + 1;
    const pz = lz + 1;

    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const z0 = Math.floor(pz);

    if (x0 < 0 || x0 >= VOXEL_PADDED_SIZE - 1 ||
        y0 < 0 || y0 >= VOXEL_PADDED_SIZE - 1 ||
        z0 < 0 || z0 >= VOXEL_PADDED_SIZE - 1) {
      return 2.0;
    }

    const fx = px - x0;
    const fy = py - y0;
    const fz = pz - z0;

    const d000 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0, y0, z0)]);
    const d100 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0 + 1, y0, z0)]);
    const d010 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0, y0 + 1, z0)]);
    const d110 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0 + 1, y0 + 1, z0)]);
    const d001 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0, y0, z0 + 1)]);
    const d101 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0 + 1, y0, z0 + 1)]);
    const d011 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0, y0 + 1, z0 + 1)]);
    const d111 = sdfInt8ToFloat(chunk.densities[getPaddedIndex(x0 + 1, y0 + 1, z0 + 1)]);

    // Trilinear interpolation
    const x00 = d000 * (1 - fx) + d100 * fx;
    const x10 = d010 * (1 - fx) + d110 * fx;
    const x01 = d001 * (1 - fx) + d101 * fx;
    const x11 = d011 * (1 - fx) + d111 * fx;

    const y0_val = x00 * (1 - fy) + x10 * fy;
    const y1_val = x01 * (1 - fy) + x11 * fy;

    return y0_val * (1 - fz) + y1_val * fz;
  }

  /**
   * Resolves a kinematic swept capsule character movement step in WebAssembly
   */
  public resolveCapsuleStep(
    pos: [number, number, number],
    vel: [number, number, number],
    radius: number,
    height: number,
    dt: number,
    gravity: number = 18.0
  ): {
    pos: [number, number, number];
    vel: [number, number, number];
    groundNormal: [number, number, number];
    groundSdf: number;
    isGrounded: boolean;
    collisionCount: number;
  } {
    const csMeters = VOXEL_CHUNK_SIZE * VOXEL_SCALE;
    const cx = Math.floor(pos[0] / csMeters);
    const cy = Math.floor(pos[1] / csMeters);
    const cz = Math.floor(pos[2] / csMeters);

    const chunk = this.getChunk(cx, cy, cz);
    if (!chunk || !this.useWasm || !voxelWasmBridge.isReady()) {
      const feetY = pos[1] - (height * 0.5);
      const groundSdf = this.querySDF(pos[0], feetY, pos[2]);
      let py = pos[1];
      let vy = vel[1] - gravity * dt;
      let grounded = false;

      if (groundSdf < 0) {
        py += -groundSdf;
        vy = 0;
        grounded = true;
      } else if (groundSdf < 0.15) {
        vy = 0;
        grounded = true;
      }

      return {
        pos: [pos[0] + vel[0] * dt, py + vy * dt, pos[2] + vel[2] * dt],
        vel: [vel[0], vy, vel[2]],
        groundNormal: [0, 1, 0],
        groundSdf,
        isGrounded: grounded,
        collisionCount: grounded ? 1 : 0
      };
    }

    return voxelWasmBridge.resolveCapsuleStep(chunk, pos, vel, radius, height, dt, gravity);
  }

  /**
   * Raycast through the Hermite SDF using sphere tracing / fine DDA
   * Returns hit position and hit normal, or null if miss
   */
  public castRay(
    originX: number, originY: number, originZ: number,
    dirX: number, dirY: number, dirZ: number,
    maxDistance = 100.0
  ): { point: [number, number, number]; normal: [number, number, number]; distance: number } | null {
    const dirLen = Math.hypot(dirX, dirY, dirZ);
    if (dirLen < 1e-5) return null;
    const dx = dirX / dirLen;
    const dy = dirY / dirLen;
    const dz = dirZ / dirLen;

    let dist = 0.1;
    const stepMin = VOXEL_SCALE * 0.25; // 0.0625 m

    while (dist < maxDistance) {
      const px = originX + dx * dist;
      const py = originY + dy * dist;
      const pz = originZ + dz * dist;

      const sdf = this.querySDF(px, py, pz);

      if (sdf <= 0.02) {
        // Hit surface! Calculate normal via central differences
        const eps = 0.05;
        const nx = this.querySDF(px + eps, py, pz) - this.querySDF(px - eps, py, pz);
        const ny = this.querySDF(px, py + eps, pz) - this.querySDF(px, py - eps, pz);
        const nz = this.querySDF(px, py, pz + eps) - this.querySDF(px, py, pz - eps);
        const nLen = Math.hypot(nx, ny, nz);
        const norm: [number, number, number] = nLen > 1e-4
          ? [nx / nLen, ny / nLen, nz / nLen]
          : [0, 1, 0];

        return {
          point: [px, py, pz],
          normal: norm,
          distance: dist
        };
      }

      // Step forward by SDF distance, clamped to stepMin
      dist += Math.max(stepMin, Math.min(sdf * 0.8, 1.5));
    }

    return null;
  }

  /**
   * World metrics summary
   */
  public getMetrics(): {
    totalChunks: number;
    activeMeshes: number;
    totalVertices: number;
    totalTriangles: number;
    totalSkirtTriangles: number;
  } {
    let activeMeshes = 0;
    let totalVertices = 0;
    let totalTriangles = 0;
    let totalSkirtTriangles = 0;

    for (const chunk of this.chunks.values()) {
      if (chunk.mesh && chunk.mesh.triangleCount > 0) {
        activeMeshes++;
        totalVertices += chunk.mesh.vertexCount;
        totalTriangles += chunk.mesh.triangleCount;
        if (chunk.mesh.skirtTriangleCount) {
          totalSkirtTriangles += chunk.mesh.skirtTriangleCount;
        }
      }
    }

    return {
      totalChunks: this.chunks.size,
      activeMeshes,
      totalVertices,
      totalTriangles,
      totalSkirtTriangles
    };
  }
}
