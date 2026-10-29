// AssemblyScript Voxel Core Engine
// Compiles to native WebAssembly (.wasm)

export const PADDED_SIZE: i32 = 18;
export const ACTIVE_SIZE: i32 = 16;
export const TOTAL_SAMPLES: i32 = 18 * 18 * 18; // 5,832 bytes
export const BASE_CELL_SIZE: f32 = 0.25;

// Pre-allocated static buffers in Wasm linear memory
export const CHUNK_BUFFER_OFFSET: i32 = 1024;    // 5,832 bytes: int8 SDF
export const MATERIAL_BUFFER_OFFSET: i32 = 6880; // 5,832 bytes: uint8 material IDs
export const RAY_RESULT_OFFSET: i32 = 12720;     // 6 floats (24 bytes): hitX, hitY, hitZ, normX, normY, normZ
export const CAPSULE_RESULT_OFFSET: i32 = 12760; // 12 floats/ints (48 bytes): posX, posY, posZ, velX, velY, velZ, normX, normY, normZ, groundSdf, isGrounded, collisionCount
export const QEF_BUFFER_OFFSET: i32 = 12820;     // 16 floats (64 bytes): ata(6), atb(3), massPoint(3), count(1), sol(3)

// System 3: Prop Shielding Scratch Buffer (32 shields * 20 bytes = 640 bytes)
export const SHIELD_BUFFER_OFFSET: i32 = 12900;
export const MAX_SHIELDS: i32 = 32;

// System 4: Metroidvania 2D Cellular Automata & A* Grid (up to 256x256)
export const GRID2D_BUFFER_OFFSET: i32 = 410000; // 65,536 bytes (1 byte/tile)
export const GRID2D_TEMP_OFFSET: i32 = 475536;   // 65,536 bytes double buffer
export const ASTAR_QUEUE_OFFSET: i32 = 541072;   // 32,768 bytes queue/visited

// System 5: Inverse Kinematics Bone Chains & Results
export const IK_CHAIN_OFFSET: i32 = 574000;      // 32 bones * 16 bytes = 512 bytes
export const IK_RESULT_OFFSET: i32 = 576000;     // 32 floats = 128 bytes

// System 6: High-Density 2D Particle Engine Buffer (2048 particles * 32 bytes = 65,536 bytes)
export const PARTICLE2D_BUFFER_OFFSET: i32 = 580000;
export const MAX_2D_PARTICLES: i32 = 2048;

let activeShieldCount: i32 = 0;
let shieldBlockedCount: i32 = 0;

export function getCapsuleResultPtr(): i32 {
  return CAPSULE_RESULT_OFFSET;
}

export function getQEFBufferPtr(): i32 {
  return QEF_BUFFER_OFFSET;
}

export function getShieldBufferPtr(): i32 {
  return SHIELD_BUFFER_OFFSET;
}

export function getActiveShieldCount(): i32 {
  return activeShieldCount;
}

export function wasmGetShieldBlockedCount(): i32 {
  return shieldBlockedCount;
}

export function wasmClearShields(): void {
  activeShieldCount = 0;
  shieldBlockedCount = 0;
}

export function wasmAddShield(
  posX: f32, posY: f32, posZ: f32,
  radius: f32, durability: f32
): i32 {
  if (activeShieldCount >= MAX_SHIELDS) return activeShieldCount;
  const offset = SHIELD_BUFFER_OFFSET + (activeShieldCount * 20);
  store<f32>(offset, posX);
  store<f32>(offset + 4, posY);
  store<f32>(offset + 8, posZ);
  store<f32>(offset + 12, radius);
  store<f32>(offset + 16, durability);
  activeShieldCount++;
  return activeShieldCount;
}

@inline
function isPointShielded(wx: f32, wy: f32, wz: f32, brushDamage: f32): bool {
  for (let s: i32 = 0; s < activeShieldCount; ++s) {
    const sOffset = SHIELD_BUFFER_OFFSET + (s * 20);
    const sx = load<f32>(sOffset);
    const sy = load<f32>(sOffset + 4);
    const sz = load<f32>(sOffset + 8);
    const sRadius = load<f32>(sOffset + 12);
    const sDurability = load<f32>(sOffset + 16);

    if (sDurability >= brushDamage) {
      const dx = wx - sx;
      const dy = wy - sy;
      const dz = wz - sz;
      if ((dx * dx + dy * dy + dz * dz) <= (sRadius * sRadius)) {
        return true;
      }
    }
  }
  return false;
}

// Max vertices per chunk: 16³ cells -> max 4096 vertices * 3 floats = 12,288 floats = 49,152 bytes
export const VERTEX_BUFFER_OFFSET: i32 = 16384;
export const NORMAL_BUFFER_OFFSET: i32 = 65536;
export const INDEX_BUFFER_OFFSET: i32 = 131072;
export const CELL_ID_MAP_OFFSET: i32 = 262144;

// 1024-capacity Rigid Debris & Particle Physics Buffer (48 bytes per particle = 49,152 bytes)
export const PARTICLE_BUFFER_OFFSET: i32 = 327680;
export const MAX_PARTICLES: i32 = 1024;

// Watertight Boundary Skirt Scratch Buffers
// Skirt map: 4096 base vertex mappings (16,384 bytes)
export const SKIRT_MAP_OFFSET: i32 = 380928;
// Boundary candidate edges: 256 edges * 20 bytes (5,120 bytes)
export const BOUNDARY_EDGE_OFFSET: i32 = 401408;

let configuredSkirtDepthFactor: f32 = 1.25;
let outSkirtTriangleCount: i32 = 0;
let outSkirtVertexCount: i32 = 0;
let outBaseTriangleCount: i32 = 0;

export function wasmSetSkirtDepth(depthFactor: f32): void {
  if (depthFactor < 0.2) depthFactor = 0.2;
  if (depthFactor > 4.0) depthFactor = 4.0;
  configuredSkirtDepthFactor = depthFactor;
}

export function getExtractedSkirtTriangleCount(): i32 {
  return outSkirtTriangleCount;
}

export function getExtractedSkirtVertexCount(): i32 {
  return outSkirtVertexCount;
}

export function getExtractedBaseTriangleCount(): i32 {
  return outBaseTriangleCount;
}

let outVertexCount: i32 = 0;
let outIndexCount: i32 = 0;
let activeParticleCount: i32 = 0;
let particleRngSeed: u32 = 123456789;

export function getParticleBufferPtr(): i32 {
  return PARTICLE_BUFFER_OFFSET;
}

export function getActiveParticleCount(): i32 {
  return activeParticleCount;
}

export function wasmClearParticles(): void {
  activeParticleCount = 0;
}

export function getChunkBufferPtr(): i32 {
  return CHUNK_BUFFER_OFFSET;
}

export function getMaterialBufferPtr(): i32 {
  return MATERIAL_BUFFER_OFFSET;
}

export function getRayResultPtr(): i32 {
  return RAY_RESULT_OFFSET;
}

export function getVertexBufferPtr(): i32 {
  return VERTEX_BUFFER_OFFSET;
}

export function getNormalBufferPtr(): i32 {
  return NORMAL_BUFFER_OFFSET;
}

export function getIndexBufferPtr(): i32 {
  return INDEX_BUFFER_OFFSET;
}

export function getExtractedVertexCount(): i32 {
  return outVertexCount;
}

export function getExtractedIndexCount(): i32 {
  return outIndexCount;
}

@inline
function getSampleIndex(x: i32, y: i32, z: i32): i32 {
  return (x * 18 * 18) + (y * 18) + z;
}

@inline
export function sampleDensity(x: i32, y: i32, z: i32): f32 {
  if (x < 0 || x >= 18 || y < 0 || y >= 18 || z < 0 || z >= 18) return 127.0;
  const idx = getSampleIndex(x, y, z);
  const raw = load<i8>(CHUNK_BUFFER_OFFSET + idx);
  return (f32(raw) / 127.0) * 4.0;
}

@inline
function setDensityInt8(x: i32, y: i32, z: i32, val: i8): void {
  if (x < 0 || x >= 18 || y < 0 || y >= 18 || z < 0 || z >= 18) return;
  const idx = getSampleIndex(x, y, z);
  store<i8>(CHUNK_BUFFER_OFFSET + idx, val);
}

@inline
function setMaterial(x: i32, y: i32, z: i32, matId: u8): void {
  if (x < 0 || x >= 18 || y < 0 || y >= 18 || z < 0 || z >= 18) return;
  const idx = getSampleIndex(x, y, z);
  store<u8>(MATERIAL_BUFFER_OFFSET + idx, matId);
}

// ---------------------------------------------------------------------------
// 3D Procedural Noise & Terrain Generation in WebAssembly
// ---------------------------------------------------------------------------

@inline
function hash3D(x: i32, y: i32, z: i32): f32 {
  let h: i32 = (x * 374761393) + (y * 668265263) + (z * 3266489917);
  h = (h ^ (h >> 13)) * 1274126177;
  const u: u32 = u32(h ^ (h >> 16)) & 0x7fffffff;
  return f32(u) / 2147483647.0;
}

function valueNoise3D(x: f32, y: f32, z: f32): f32 {
  const ix = i32(Mathf.floor(x));
  const iy = i32(Mathf.floor(y));
  const iz = i32(Mathf.floor(z));

  const fx = x - f32(ix);
  const fy = y - f32(iy);
  const fz = z - f32(iz);

  // Smoothstep cubic interpolation
  const u = fx * fx * (3.0 - 2.0 * fx);
  const v = fy * fy * (3.0 - 2.0 * fy);
  const w = fz * fz * (3.0 - 2.0 * fz);

  const c000 = hash3D(ix, iy, iz);
  const c100 = hash3D(ix + 1, iy, iz);
  const c010 = hash3D(ix, iy + 1, iz);
  const c110 = hash3D(ix + 1, iy + 1, iz);
  const c001 = hash3D(ix, iy, iz + 1);
  const c101 = hash3D(ix + 1, iy, iz + 1);
  const c011 = hash3D(ix, iy + 1, iz + 1);
  const c111 = hash3D(ix + 1, iy + 1, iz + 1);

  const x00 = c000 * (1.0 - u) + c100 * u;
  const x10 = c010 * (1.0 - u) + c110 * u;
  const x01 = c001 * (1.0 - u) + c101 * u;
  const x11 = c011 * (1.0 - u) + c111 * u;

  const y0 = x00 * (1.0 - v) + x10 * v;
  const y1 = x01 * (1.0 - v) + x11 * v;

  return y0 * (1.0 - w) + y1 * w;
}

function fbm3D(x: f32, y: f32, z: f32, octaves: i32): f32 {
  let total: f32 = 0.0;
  let amplitude: f32 = 1.0;
  let frequency: f32 = 1.0;
  let maxVal: f32 = 0.0;

  for (let i = 0; i < octaves; ++i) {
    total += valueNoise3D(x * frequency, y * frequency, z * frequency) * amplitude;
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return total / maxVal;
}

/**
 * Procedural SDF & Cave Generation in WebAssembly
 * Writes 5,832 signed distances to CHUNK_BUFFER_OFFSET and material IDs to MATERIAL_BUFFER_OFFSET
 */
export function wasmGenerateProceduralTerrain(
  chunkCx: i32,
  chunkCy: i32,
  chunkCz: i32
): i32 {
  const chunkOriginX = f32(chunkCx) * 16.0 * BASE_CELL_SIZE;
  const chunkOriginY = f32(chunkCy) * 16.0 * BASE_CELL_SIZE;
  const chunkOriginZ = f32(chunkCz) * 16.0 * BASE_CELL_SIZE;

  let solidCount: i32 = 0;

  for (let pz: i32 = 0; pz < 18; ++pz) {
    const wz = chunkOriginZ + (f32(pz - 1) * BASE_CELL_SIZE);
    for (let py: i32 = 0; py < 18; ++py) {
      const wy = chunkOriginY + (f32(py - 1) * BASE_CELL_SIZE);
      for (let px: i32 = 0; px < 18; ++px) {
        const wx = chunkOriginX + (f32(px - 1) * BASE_CELL_SIZE);

        // 1. Base rolling hills heightfield
        const hillNoise: f32 = fbm3D(wx * 0.04, 0.2, wz * 0.04, 3);
        const rawMtn: f32 = fbm3D(wx * 0.02, 0.5, wz * 0.02, 2);
        const mountainNoise: f32 = Mathf.pow(rawMtn, 1.6);
        const groundHeight: f32 = f32(-1.0) + (hillNoise * 4.0) + (mountainNoise * 7.0);

        let sdf: f32 = wy - groundHeight;

        // 2. 3D Overhangs & Crags
        const crag: f32 = (fbm3D(wx * 0.08, wy * 0.08, wz * 0.08, 2) - 0.5) * 2.5;
        sdf += crag * 0.4;

        // 3. 3D Cave Networks (Worm-like subterranean pipes)
        if (wy < groundHeight + 1.0) {
          const cave1: f32 = fbm3D(wx * 0.07 + 10.0, wy * 0.09, wz * 0.07 + 5.0, 2);
          const cave2: f32 = fbm3D(wx * 0.07 - 20.0, wy * 0.09 + 3.0, wz * 0.07 - 12.0, 2);
          const caveVal: f32 = (cave1 * cave1) + (cave2 * cave2);

          if (caveVal < 0.12 && wy < groundHeight - 1.5) {
            const caveDistance: f32 = (caveVal - 0.12) * 8.0;
            sdf = Mathf.max(sdf, -caveDistance);
          }
        }

        // Clamp to [-4.0..4.0] and map to int8 [-128..127]
        const clamped = Mathf.max(-4.0, Mathf.min(3.99, sdf));
        const rawI8 = i8(Mathf.round((clamped / 4.0) * 127.0));
        setDensityInt8(px, py, pz, rawI8);

        // Materials: 0=Air, 1=Stone, 3=Grass, 4=Basalt, 6=Snow
        if (sdf < 0.0) {
          solidCount++;
          if (wy > 5.5) {
            setMaterial(px, py, pz, 6);
          } else if (wy > 2.0 && crag > 0.2) {
            setMaterial(px, py, pz, 4);
          } else if (wy < -2.0) {
            setMaterial(px, py, pz, 1);
          } else {
            setMaterial(px, py, pz, 3);
          }
        } else {
          setMaterial(px, py, pz, 0);
        }
      }
    }
  }

  return solidCount;
}

// ---------------------------------------------------------------------------
// Trilinear SDF Interpolation & Sphere Tracing in WebAssembly
// ---------------------------------------------------------------------------

/**
 * Trilinear Hermite SDF lookup in voxel coordinates [0..16]
 */
export function wasmQueryTrilinearSDF(lx: f32, ly: f32, lz: f32): f32 {
  // Padded buffer offset: 0 in local space is at index 1
  const px = lx + 1.0;
  const py = ly + 1.0;
  const pz = lz + 1.0;

  const x0 = i32(Mathf.floor(px));
  const y0 = i32(Mathf.floor(py));
  const z0 = i32(Mathf.floor(pz));

  if (x0 < 0 || x0 >= 17 || y0 < 0 || y0 >= 17 || z0 < 0 || z0 >= 17) {
    return 2.0;
  }

  const fx = px - f32(x0);
  const fy = py - f32(y0);
  const fz = pz - f32(z0);

  const d000 = sampleDensity(x0, y0, z0);
  const d100 = sampleDensity(x0 + 1, y0, z0);
  const d010 = sampleDensity(x0, y0 + 1, z0);
  const d110 = sampleDensity(x0 + 1, y0 + 1, z0);
  const d001 = sampleDensity(x0, y0, z0 + 1);
  const d101 = sampleDensity(x0 + 1, y0, z0 + 1);
  const d011 = sampleDensity(x0, y0 + 1, z0 + 1);
  const d111 = sampleDensity(x0 + 1, y0 + 1, z0 + 1);

  const x00 = d000 * (1.0 - fx) + d100 * fx;
  const x10 = d010 * (1.0 - fx) + d110 * fx;
  const x01 = d001 * (1.0 - fx) + d101 * fx;
  const x11 = d011 * (1.0 - fx) + d111 * fx;

  const y0_val = x00 * (1.0 - fy) + x10 * fy;
  const y1_val = x01 * (1.0 - fy) + x11 * fy;

  return y0_val * (1.0 - fz) + y1_val * fz;
}

/**
 * Sphere-tracing raymarch through current chunk in Wasm
 * Writes hit position and normal to RAY_RESULT_OFFSET (6 floats)
 * Returns hit distance if hit, or -1.0 if miss
 */
export function wasmRaymarchChunk(
  originX: f32, originY: f32, originZ: f32,
  dirX: f32, dirY: f32, dirZ: f32,
  maxDist: f32
): f32 {
  let len = Mathf.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  if (len < 0.00001) return -1.0;
  const dx = dirX / len;
  const dy = dirY / len;
  const dz = dirZ / len;

  let dist: f32 = 0.05;
  const stepMin: f32 = BASE_CELL_SIZE * 0.25;

  while (dist < maxDist) {
    const px = originX + dx * dist;
    const py = originY + dy * dist;
    const pz = originZ + dz * dist;

    // Convert world space relative to chunk to voxel coords
    const lx = px / BASE_CELL_SIZE;
    const ly = py / BASE_CELL_SIZE;
    const lz = pz / BASE_CELL_SIZE;

    if (lx < 0.0 || lx > 16.0 || ly < 0.0 || ly > 16.0 || lz < 0.0 || lz > 16.0) {
      // Outside this chunk
      dist += 0.25;
      continue;
    }

    const sdf = wasmQueryTrilinearSDF(lx, ly, lz);

    if (sdf <= 0.02) {
      // Hit surface! Estimate normal via central difference
      const eps: f32 = 0.05;
      const nx = wasmQueryTrilinearSDF((px + eps) / BASE_CELL_SIZE, ly, lz) - wasmQueryTrilinearSDF((px - eps) / BASE_CELL_SIZE, ly, lz);
      const ny = wasmQueryTrilinearSDF(lx, (py + eps) / BASE_CELL_SIZE, lz) - wasmQueryTrilinearSDF(lx, (py - eps) / BASE_CELL_SIZE, lz);
      const nz = wasmQueryTrilinearSDF(lx, ly, (pz + eps) / BASE_CELL_SIZE) - wasmQueryTrilinearSDF(lx, ly, (pz - eps) / BASE_CELL_SIZE);

      let nLen = Mathf.sqrt(nx * nx + ny * ny + nz * nz);
      if (nLen < 0.0001) nLen = 1.0;

      // Store hit point and normal into RAY_RESULT_OFFSET (6 floats = 24 bytes)
      store<f32>(RAY_RESULT_OFFSET, px);
      store<f32>(RAY_RESULT_OFFSET + 4, py);
      store<f32>(RAY_RESULT_OFFSET + 8, pz);
      store<f32>(RAY_RESULT_OFFSET + 12, nx / nLen);
      store<f32>(RAY_RESULT_OFFSET + 16, ny / nLen);
      store<f32>(RAY_RESULT_OFFSET + 20, nz / nLen);

      return dist;
    }

    // Step by at least stepMin or 0.6 * sdf
    dist += Mathf.max(stepMin, sdf * 0.65);
  }

  return -1.0;
}

// ---------------------------------------------------------------------------
// CSG Analytical Brush Stamp in WebAssembly
// ---------------------------------------------------------------------------

export function wasmApplyBrushWithDamage(
  shape: i32,
  op: i32,
  brushCenterX: f32,
  brushCenterY: f32,
  brushCenterZ: f32,
  radius: f32,
  height: f32,
  chunkWorldX: f32,
  chunkWorldY: f32,
  chunkWorldZ: f32,
  brushDamage: f32
): i32 {
  let modifiedCount: i32 = 0;

  for (let x: i32 = 0; x < 18; ++x) {
    const wx = chunkWorldX + (f32(x - 1) * BASE_CELL_SIZE);
    for (let y: i32 = 0; y < 18; ++y) {
      const wy = chunkWorldY + (f32(y - 1) * BASE_CELL_SIZE);
      for (let z: i32 = 0; z < 18; ++z) {
        const wz = chunkWorldZ + (f32(z - 1) * BASE_CELL_SIZE);

        // Inline Prop Shielding check: if Carve and point is within an active shield radius
        if (op == 0 && activeShieldCount > 0 && isPointShielded(wx, wy, wz, brushDamage)) {
          shieldBlockedCount++;
          continue;
        }

        const dx = wx - brushCenterX;
        const dy = wy - brushCenterY;
        const dz = wz - brushCenterZ;

        let brushDist: f32 = 999.0;

        if (shape == 0) {
          // Sphere
          brushDist = Mathf.sqrt(dx * dx + dy * dy + dz * dz) - radius;
        } else if (shape == 1) {
          // Box
          const qx = Mathf.abs(dx) - radius;
          const qy = Mathf.abs(dy) - radius;
          const qz = Mathf.abs(dz) - radius;
          const ox = Mathf.max(qx, 0.0);
          const oy = Mathf.max(qy, 0.0);
          const oz = Mathf.max(qz, 0.0);
          const outside = Mathf.sqrt(ox * ox + oy * oy + oz * oz);
          const inside = Mathf.min(Mathf.max(qx, Mathf.max(qy, qz)), 0.0);
          brushDist = outside + inside;
        } else if (shape == 2) {
          // Cylinder
          const horizDist = Mathf.sqrt(dx * dx + dz * dz) - radius;
          const vertDist = Mathf.abs(dy) - (height * 0.5);
          const ox = Mathf.max(horizDist, 0.0);
          const oy = Mathf.max(vertDist, 0.0);
          brushDist = Mathf.min(Mathf.max(horizDist, vertDist), 0.0) + Mathf.sqrt(ox * ox + oy * oy);
        } else {
          // Capsule
          const halfH = Mathf.max((height * 0.5) - radius, 0.0);
          const clampedY = Mathf.max(-halfH, Mathf.min(halfH, dy));
          const cdx = dx;
          const cdy = dy - clampedY;
          const cdz = dz;
          brushDist = Mathf.sqrt(cdx * cdx + cdy * cdy + cdz * cdz) - radius;
        }

        const currentDist = sampleDensity(x, y, z);
        let newDist: f32 = currentDist;

        if (op == 0) {
          // Carve (difference: max(A, -B))
          newDist = Mathf.max(currentDist, -brushDist);
        } else if (op == 1) {
          // Add (union: min(A, B))
          newDist = Mathf.min(currentDist, brushDist);
        } else {
          // Smooth blend
          const k: f32 = 0.5;
          const h = Mathf.max(k - Mathf.abs(currentDist - brushDist), 0.0) / k;
          newDist = Mathf.min(currentDist, brushDist) - h * h * k * 0.25;
        }

        const clamped = Mathf.max(-4.0, Mathf.min(3.99, newDist));
        const rawI8 = i8(Mathf.round((clamped / 4.0) * 127.0));
        setDensityInt8(x, y, z, rawI8);
        modifiedCount++;
      }
    }
  }

  return modifiedCount;
}

export function wasmApplyBrush(
  shape: i32,
  op: i32,
  brushCenterX: f32,
  brushCenterY: f32,
  brushCenterZ: f32,
  radius: f32,
  height: f32,
  chunkWorldX: f32,
  chunkWorldY: f32,
  chunkWorldZ: f32
): i32 {
  return wasmApplyBrushWithDamage(
    shape, op,
    brushCenterX, brushCenterY, brushCenterZ,
    radius, height,
    chunkWorldX, chunkWorldY, chunkWorldZ,
    0.0
  );
}

// ---------------------------------------------------------------------------
// Surface Nets Isosurface Extraction & 22.5° Normal Snap in WebAssembly
// ---------------------------------------------------------------------------

const SNAP_ANGLE: f32 = 0.39269908169872414; // 22.5 deg in radians

function quantizeYaw(nx: f32, nz: f32): f32 {
  const horizontalLen = Mathf.sqrt(nx * nx + nz * nz);
  if (horizontalLen < 0.001) return 0.0;
  let angle = Mathf.atan2(nz, nx);
  if (angle < 0.0) angle += 6.283185307179586;
  const snapped = Mathf.round(angle / SNAP_ANGLE) * SNAP_ANGLE;
  return snapped;
}

/**
 * Multi-LOD Surface Nets Isosurface Extraction & Normal Quantization in WebAssembly
 * LOD 0: 0.25m cell size (16 active cells per axis)
 * LOD 1: 0.50m cell size (8 active cells per axis)
 * LOD 2: 1.00m cell size (4 active cells per axis)
 * LOD 3: 2.00m cell size (2 active cells per axis)
 */
export function wasmExtractSurfaceNetsLOD(
  lod: i32,
  quantizeNormals: i32,
  generateSkirts: i32
): i32 {
  outVertexCount = 0;
  outIndexCount = 0;
  outSkirtTriangleCount = 0;
  outSkirtVertexCount = 0;
  outBaseTriangleCount = 0;

  let step: i32 = 1;
  if (lod == 1) step = 2;
  else if (lod == 2) step = 4;
  else if (lod >= 3) step = 8;

  const cells: i32 = 16 / step;
  const pitch: i32 = cells + 1;
  const totalGridPoints: i32 = pitch * pitch * pitch;

  for (let i: i32 = 0; i < totalGridPoints; ++i) {
    store<i32>(CELL_ID_MAP_OFFSET + (i * 4), -1);
  }

  // Pass 1: Find boundary-crossing active cells at this LOD step
  for (let gx: i32 = 0; gx < cells; ++gx) {
    const x: i32 = 1 + (gx * step);
    for (let gy: i32 = 0; gy < cells; ++gy) {
      const y: i32 = 1 + (gy * step);
      for (let gz: i32 = 0; gz < cells; ++gz) {
        const z: i32 = 1 + (gz * step);

        let mask: i32 = 0;

        for (let corner: i32 = 0; corner < 8; ++corner) {
          const cx = x + ((corner & 1) * step);
          const cy = y + (((corner >> 1) & 1) * step);
          const cz = z + (((corner >> 2) & 1) * step);
          const d = sampleDensity(cx, cy, cz);
          if (d < 0.0) {
            mask |= (1 << corner);
          }
        }

        if (mask == 0 || mask == 255) continue;

        const cellCenterX = (f32(x - 1) + (f32(step) * 0.5)) * BASE_CELL_SIZE;
        const cellCenterY = (f32(y - 1) + (f32(step) * 0.5)) * BASE_CELL_SIZE;
        const cellCenterZ = (f32(z - 1) + (f32(step) * 0.5)) * BASE_CELL_SIZE;

        const dX = sampleDensity(x + step, y, z) - sampleDensity(x - step, y, z);
        const dY = sampleDensity(x, y + step, z) - sampleDensity(x, y - step, z);
        const dZ = sampleDensity(x, y, z + step) - sampleDensity(x, y, z - step);

        let len = Mathf.sqrt(dX * dX + dY * dY + dZ * dZ);
        if (len < 0.0001) len = 1.0;
        let nx = dX / len;
        let ny = dY / len;
        let nz = dZ / len;

        if (quantizeNormals != 0) {
          const snappedYaw = quantizeYaw(nx, nz);
          const horizontalLen = Mathf.sqrt(nx * nx + nz * nz);
          nx = Mathf.cos(snappedYaw) * horizontalLen;
          nz = Mathf.sin(snappedYaw) * horizontalLen;

          let nLen = Mathf.sqrt(nx * nx + ny * ny + nz * nz);
          if (nLen > 0.0001) {
            nx /= nLen;
            ny /= nLen;
            nz /= nLen;
          }
        }

        const vIdx = outVertexCount;
        const posOffset = VERTEX_BUFFER_OFFSET + (vIdx * 12);
        store<f32>(posOffset, cellCenterX);
        store<f32>(posOffset + 4, cellCenterY);
        store<f32>(posOffset + 8, cellCenterZ);

        const normOffset = NORMAL_BUFFER_OFFSET + (vIdx * 12);
        store<f32>(normOffset, nx);
        store<f32>(normOffset + 4, ny);
        store<f32>(normOffset + 8, nz);

        const gridMapIdx = (gx * pitch * pitch) + (gy * pitch) + gz;
        store<i32>(CELL_ID_MAP_OFFSET + (gridMapIdx * 4), vIdx);
        outVertexCount++;
      }
    }
  }

  // Pass 2: Connect neighboring dual vertices to form quads and triangles
  for (let gx: i32 = 0; gx < cells - 1; ++gx) {
    for (let gy: i32 = 0; gy < cells - 1; ++gy) {
      for (let gz: i32 = 0; gz < cells - 1; ++gz) {
        // X-axis quad
        const v00 = load<i32>(CELL_ID_MAP_OFFSET + ((gx * pitch * pitch + gy * pitch + gz) * 4));
        const v10 = load<i32>(CELL_ID_MAP_OFFSET + (((gx + 1) * pitch * pitch + gy * pitch + gz) * 4));
        const v01 = load<i32>(CELL_ID_MAP_OFFSET + ((gx * pitch * pitch + (gy + 1) * pitch + gz) * 4));
        const v11 = load<i32>(CELL_ID_MAP_OFFSET + (((gx + 1) * pitch * pitch + (gy + 1) * pitch + gz) * 4));

        if (v00 >= 0 && v10 >= 0 && v01 >= 0 && v11 >= 0) {
          const idxOffset = INDEX_BUFFER_OFFSET + (outIndexCount * 4);
          store<u32>(idxOffset, u32(v00));
          store<u32>(idxOffset + 4, u32(v10));
          store<u32>(idxOffset + 8, u32(v11));

          store<u32>(idxOffset + 12, u32(v00));
          store<u32>(idxOffset + 16, u32(v11));
          store<u32>(idxOffset + 20, u32(v01));
          outIndexCount += 6;
        }

        // Y-axis quad
        const vZ00 = load<i32>(CELL_ID_MAP_OFFSET + ((gx * pitch * pitch + gy * pitch + gz) * 4));
        const vZ01 = load<i32>(CELL_ID_MAP_OFFSET + ((gx * pitch * pitch + gy * pitch + (gz + 1)) * 4));
        const vZ10 = load<i32>(CELL_ID_MAP_OFFSET + (((gx + 1) * pitch * pitch + gy * pitch + gz) * 4));
        const vZ11 = load<i32>(CELL_ID_MAP_OFFSET + (((gx + 1) * pitch * pitch + gy * pitch + (gz + 1)) * 4));

        if (vZ00 >= 0 && vZ01 >= 0 && vZ10 >= 0 && vZ11 >= 0) {
          const idxOffset = INDEX_BUFFER_OFFSET + (outIndexCount * 4);
          store<u32>(idxOffset, u32(vZ00));
          store<u32>(idxOffset + 4, u32(vZ11));
          store<u32>(idxOffset + 8, u32(vZ10));

          store<u32>(idxOffset + 12, u32(vZ00));
          store<u32>(idxOffset + 16, u32(vZ01));
          store<u32>(idxOffset + 20, u32(vZ11));
          outIndexCount += 6;
        }
      }
    }
  }

  outBaseTriangleCount = outIndexCount / 3;

  // Pass 3: Watertight Seam Boundary Skirt Extrusion in WebAssembly
  if (generateSkirts != 0 && outVertexCount > 0) {
    const numBaseVerts: i32 = outVertexCount;
    const skirtDepth: f32 = configuredSkirtDepthFactor * BASE_CELL_SIZE * f32(step);
    const threshold: f32 = (f32(step) * BASE_CELL_SIZE) * 0.95;
    const chunkMin: f32 = 0.0;
    const chunkMax: f32 = 16.0 * BASE_CELL_SIZE;

    // Initialize skirt mapping table in scratch memory
    for (let v: i32 = 0; v < numBaseVerts; ++v) {
      store<i32>(SKIRT_MAP_OFFSET + (v * 4), -1);
    }

    // Identify perimeter boundary vertices on X and Z borders
    for (let v: i32 = 0; v < numBaseVerts; ++v) {
      const vPos = VERTEX_BUFFER_OFFSET + (v * 12);
      const vx = load<f32>(vPos);
      const vy = load<f32>(vPos + 4);
      const vz = load<f32>(vPos + 8);

      const vNorm = NORMAL_BUFFER_OFFSET + (v * 12);
      const nx = load<f32>(vNorm);
      const ny = load<f32>(vNorm + 4);
      const nz = load<f32>(vNorm + 8);

      const isBorder = (
        vx < (chunkMin + threshold) ||
        vx > (chunkMax - threshold) ||
        vz < (chunkMin + threshold) ||
        vz > (chunkMax - threshold)
      );

      // Only extrude upward-facing / horizontal terrain boundary vertices
      if (isBorder && ny > 0.1) {
        if (outVertexCount < 4090) {
          const skirtIdx: i32 = outVertexCount;
          store<i32>(SKIRT_MAP_OFFSET + (v * 4), skirtIdx);

          // Extrude position downwards by skirtDepth
          const sPos = VERTEX_BUFFER_OFFSET + (skirtIdx * 12);
          store<f32>(sPos, vx);
          store<f32>(sPos + 4, vy - skirtDepth);
          store<f32>(sPos + 8, vz);

          // Inherit horizontal/outward quantized normal
          const sNorm = NORMAL_BUFFER_OFFSET + (skirtIdx * 12);
          store<f32>(sNorm, nx);
          store<f32>(sNorm + 4, 0.0);
          store<f32>(sNorm + 8, nz);

          outVertexCount++;
          outSkirtVertexCount++;
        }
      }
    }

    // Connect boundary edges with watertight skirt quads
    let boundaryEdgeCount: i32 = 0;
    const maxBoundaryEdges: i32 = 256;
    const baseIndexCount: i32 = outIndexCount;

    for (let t: i32 = 0; t < baseIndexCount; t += 3) {
      const i0 = load<u32>(INDEX_BUFFER_OFFSET + (t * 4));
      const i1 = load<u32>(INDEX_BUFFER_OFFSET + ((t + 1) * 4));
      const i2 = load<u32>(INDEX_BUFFER_OFFSET + ((t + 2) * 4));

      for (let e: i32 = 0; e < 3; ++e) {
        let a: u32 = i0;
        let b: u32 = i1;
        if (e == 1) { a = i1; b = i2; }
        else if (e == 2) { a = i2; b = i0; }

        const sA = load<i32>(SKIRT_MAP_OFFSET + (i32(a) * 4));
        const sB = load<i32>(SKIRT_MAP_OFFSET + (i32(b) * 4));

        if (sA >= 0 && sB >= 0) {
          let foundIdx: i32 = -1;
          for (let k: i32 = 0; k < boundaryEdgeCount; ++k) {
            const edgeBase = BOUNDARY_EDGE_OFFSET + (k * 20);
            const ea = u32(load<i32>(edgeBase));
            const eb = u32(load<i32>(edgeBase + 4));
            if ((ea == a && eb == b) || (ea == b && eb == a)) {
              foundIdx = k;
              break;
            }
          }

          if (foundIdx >= 0) {
            const countOffset = BOUNDARY_EDGE_OFFSET + (foundIdx * 20) + 16;
            const cnt = load<i32>(countOffset);
            store<i32>(countOffset, cnt + 1);
          } else if (boundaryEdgeCount < maxBoundaryEdges) {
            const edgeBase = BOUNDARY_EDGE_OFFSET + (boundaryEdgeCount * 20);
            store<i32>(edgeBase, i32(a));
            store<i32>(edgeBase + 4, i32(b));
            store<i32>(edgeBase + 8, sA);
            store<i32>(edgeBase + 12, sB);
            store<i32>(edgeBase + 16, 1);
            boundaryEdgeCount++;
          }
        }
      }
    }

    // Emit skirt quads for edges on the true chunk perimeter (count == 1)
    for (let k: i32 = 0; k < boundaryEdgeCount; ++k) {
      const edgeBase = BOUNDARY_EDGE_OFFSET + (k * 20);
      const cnt = load<i32>(edgeBase + 16);
      if (cnt == 1) {
        const a = u32(load<i32>(edgeBase));
        const b = u32(load<i32>(edgeBase + 4));
        const sA = u32(load<i32>(edgeBase + 8));
        const sB = u32(load<i32>(edgeBase + 12));

        if (outIndexCount + 6 < 32000) {
          const idxOffset = INDEX_BUFFER_OFFSET + (outIndexCount * 4);
          store<u32>(idxOffset, a);
          store<u32>(idxOffset + 4, sA);
          store<u32>(idxOffset + 8, b);

          store<u32>(idxOffset + 12, b);
          store<u32>(idxOffset + 16, sA);
          store<u32>(idxOffset + 20, sB);
          outIndexCount += 6;
          outSkirtTriangleCount += 2;
        }
      }
    }
  }

  return outIndexCount / 3;
}

/**
 * Backward compatibility: LOD 0
 */
export function wasmExtractSurfaceNets(
  quantizeNormals: i32,
  generateSkirts: i32
): i32 {
  return wasmExtractSurfaceNetsLOD(0, quantizeNormals, generateSkirts);
}

/**
 * Box-filters the active 18x18x18 chunk SDF buffer by factor (2 or 4)
 * Returns count of filtered samples
 */
export function wasmDownsampleSDF(factor: i32): i32 {
  if (factor < 2) return 0;
  let downsampledCount: i32 = 0;

  for (let x: i32 = 0; x < 18; x += factor) {
    for (let y: i32 = 0; y < 18; y += factor) {
      for (let z: i32 = 0; z < 18; z += factor) {
        // Compute average distance across octant
        let sumDist: f32 = 0.0;
        let count: f32 = 0.0;

        for (let dx: i32 = 0; dx < factor && (x + dx) < 18; ++dx) {
          for (let dy: i32 = 0; dy < factor && (y + dy) < 18; ++dy) {
            for (let dz: i32 = 0; dz < factor && (z + dz) < 18; ++dz) {
              sumDist += sampleDensity(x + dx, y + dy, z + dz);
              count += 1.0;
            }
          }
        }

        const avgDist = sumDist / count;
        const clamped = Mathf.max(-4.0, Mathf.min(3.99, avgDist));
        const rawI8 = i8(Mathf.round((clamped / 4.0) * 127.0));

        // Overwrite block with filtered average
        for (let dx: i32 = 0; dx < factor && (x + dx) < 18; ++dx) {
          for (let dy: i32 = 0; dy < factor && (y + dy) < 18; ++dy) {
            for (let dz: i32 = 0; dz < factor && (z + dz) < 18; ++dz) {
              setDensityInt8(x + dx, y + dy, z + dz, rawI8);
            }
          }
        }
        downsampledCount++;
      }
    }
  }

  return downsampledCount;
}

// ---------------------------------------------------------------------------
// High-Density Particle & Rigid Debris Physics Simulation in WebAssembly
// ---------------------------------------------------------------------------

@inline
function nextRngFloat(): f32 {
  particleRngSeed = (particleRngSeed * 1664525 + 1013904223);
  const u: u32 = particleRngSeed & 0x7fffffff;
  return f32(u) / 2147483647.0;
}

export function wasmSpawnParticle(
  px: f32, py: f32, pz: f32,
  vx: f32, vy: f32, vz: f32,
  cr: f32, cg: f32, cb: f32,
  maxLife: f32, size: f32
): i32 {
  if (activeParticleCount >= MAX_PARTICLES) return activeParticleCount;
  const offset = PARTICLE_BUFFER_OFFSET + (activeParticleCount * 48);

  store<f32>(offset, px);
  store<f32>(offset + 4, py);
  store<f32>(offset + 8, pz);

  store<f32>(offset + 12, vx);
  store<f32>(offset + 16, vy);
  store<f32>(offset + 20, vz);

  store<f32>(offset + 24, cr);
  store<f32>(offset + 28, cg);
  store<f32>(offset + 32, cb);

  store<f32>(offset + 36, 0.0); // life starts at 0
  store<f32>(offset + 40, maxLife > 0.1 ? maxLife : 1.0);
  store<f32>(offset + 44, size > 0.01 ? size : 0.15);

  activeParticleCount++;
  return activeParticleCount;
}

export function wasmSpawnDebrisBurst(
  ox: f32, oy: f32, oz: f32,
  count: i32,
  cr: f32, cg: f32, cb: f32,
  baseSpeed: f32
): i32 {
  let spawned: i32 = 0;
  for (let i: i32 = 0; i < count; ++i) {
    if (activeParticleCount >= MAX_PARTICLES) break;

    const angle = nextRngFloat() * 6.2831853;
    const speed = baseSpeed * (f32(0.6) + nextRngFloat() * f32(0.8));
    const vx = Mathf.cos(angle) * speed;
    const vy = (f32(1.5) + nextRngFloat() * f32(3.5)) * (baseSpeed * f32(0.4));
    const vz = Mathf.sin(angle) * speed;

    const px = ox + (nextRngFloat() - f32(0.5)) * f32(0.4);
    const py = oy + nextRngFloat() * f32(0.5);
    const pz = oz + (nextRngFloat() - f32(0.5)) * f32(0.4);

    const maxLife = f32(1.0) + nextRngFloat() * f32(1.2);
    const size = f32(0.12) + nextRngFloat() * f32(0.16);

    wasmSpawnParticle(px, py, pz, vx, vy, vz, cr, cg, cb, maxLife, size);
    spawned++;
  }
  return spawned;
}

export function wasmUpdateParticles(
  dt: f32,
  gravity: f32,
  bounceTerrain: i32
): i32 {
  for (let i: i32 = activeParticleCount - 1; i >= 0; --i) {
    const offset = PARTICLE_BUFFER_OFFSET + (i * 48);

    let life = load<f32>(offset + 36);
    const maxLife = load<f32>(offset + 40);

    life += dt / maxLife;

    if (life >= 1.0) {
      // Dead particle: swap with last active particle (O(1) swap-back compaction)
      const lastIdx = activeParticleCount - 1;
      if (i != lastIdx) {
        const lastOffset = PARTICLE_BUFFER_OFFSET + (lastIdx * 48);
        for (let b: i32 = 0; b < 12; ++b) {
          store<f32>(offset + (b * 4), load<f32>(lastOffset + (b * 4)));
        }
      }
      activeParticleCount--;
      continue;
    }

    store<f32>(offset + 36, life);

    let px = load<f32>(offset);
    let py = load<f32>(offset + 4);
    let pz = load<f32>(offset + 8);

    let vx = load<f32>(offset + 12);
    let vy = load<f32>(offset + 16);
    let vz = load<f32>(offset + 20);

    // Aerodynamic drag
    vx *= (f32(1.0) - (f32(0.8) * dt));
    vz *= (f32(1.0) - (f32(0.8) * dt));

    // Gravity
    vy -= gravity * dt;

    // Euler integration step
    px += vx * dt;
    py += vy * dt;
    pz += vz * dt;

    // Terrain Hermite SDF Bounce Collision
    if (bounceTerrain != 0) {
      const lx = px / BASE_CELL_SIZE;
      const ly = py / BASE_CELL_SIZE;
      const lz = pz / BASE_CELL_SIZE;

      if (lx >= 0.0 && lx <= 16.0 && ly >= 0.0 && ly <= 16.0 && lz >= 0.0 && lz <= 16.0) {
        const sdf = wasmQueryTrilinearSDF(lx, ly, lz);
        if (sdf <= 0.04) {
          // Surface collision! Calculate normal via central difference
          const eps: f32 = 0.05;
          const nx = wasmQueryTrilinearSDF((px + eps) / BASE_CELL_SIZE, ly, lz) - wasmQueryTrilinearSDF((px - eps) / BASE_CELL_SIZE, ly, lz);
          const ny = wasmQueryTrilinearSDF(lx, (py + eps) / BASE_CELL_SIZE, lz) - wasmQueryTrilinearSDF(lx, (py - eps) / BASE_CELL_SIZE, lz);
          const nz = wasmQueryTrilinearSDF(lx, ly, (pz + eps) / BASE_CELL_SIZE) - wasmQueryTrilinearSDF(lx, ly, (pz - eps) / BASE_CELL_SIZE);

          let nLen = Mathf.sqrt(nx * nx + ny * ny + nz * nz);
          if (nLen < 0.0001) nLen = 1.0;
          const unx = nx / nLen;
          const uny = ny / nLen;
          const unz = nz / nLen;

          const dot = vx * unx + vy * uny + vz * unz;
          if (dot < 0.0) {
            // Restitution bounce with ground friction
            const restitution: f32 = 0.38;
            vx -= (f32(1.0) + restitution) * dot * unx;
            vy -= (f32(1.0) + restitution) * dot * uny;
            vz -= (f32(1.0) + restitution) * dot * unz;

            vx *= 0.65;
            vz *= 0.65;
            py += 0.04;
          }
        }
      }
    }

    // Bottom grid clamp
    if (py < -7.9) {
      py = -7.9;
      vy = -vy * 0.3;
      vx *= 0.6;
      vz *= 0.6;
    }

    store<f32>(offset, px);
    store<f32>(offset + 4, py);
    store<f32>(offset + 8, pz);

    store<f32>(offset + 12, vx);
    store<f32>(offset + 16, vy);
    store<f32>(offset + 20, vz);
  }

  return activeParticleCount;
}

// ---------------------------------------------------------------------------
// Kinematic Character Controller (KCC) Swept Capsule Collision in Wasm
// ---------------------------------------------------------------------------

/**
 * Swept Capsule Kinematic Character Controller in WebAssembly
 * Solves multi-sphere penetration against the loaded Hermite SDF chunk,
 * projects depenetration displacement along surface gradients, slides along
 * tangents, prevents clipping through vertical walls, and flags ground contact.
 */
export function wasmResolveCapsuleStep(
  posX: f32, posY: f32, posZ: f32,
  velX: f32, velY: f32, velZ: f32,
  radius: f32, height: f32,
  dt: f32,
  gravity: f32,
  chunkOriginX: f32, chunkOriginY: f32, chunkOriginZ: f32
): i32 {
  let px = posX;
  let py = posY;
  let pz = posZ;

  let vx = velX;
  let vy = velY - (gravity * dt);
  let vz = velZ;

  // Integrate tentative displacement
  px += vx * dt;
  py += vy * dt;
  pz += vz * dt;

  let isGrounded: i32 = 0;
  let collisionCount: i32 = 0;
  let groundNx: f32 = 0.0;
  let groundNy: f32 = 1.0;
  let groundNz: f32 = 0.0;
  let minGroundSdf: f32 = 999.0;

  // Half-height of vertical segment between top and bottom sphere centers
  const halfSegment = Mathf.max((height * 0.5) - radius, 0.05);

  // 4 solver relaxation iterations
  for (let iter: i32 = 0; iter < 4; ++iter) {
    // 5 sample spheres along vertical capsule spine:
    // s = -1.0 (feet), -0.5 (knees), 0.0 (waist), 0.5 (chest), 1.0 (head)
    for (let sIdx: i32 = 0; sIdx < 5; ++sIdx) {
      const sFrac: f32 = -1.0 + (f32(sIdx) * 0.5);
      const sphereY = py + (sFrac * halfSegment);

      // Convert world coordinate to local chunk voxel coordinates [0..16]
      const lx = (px - chunkOriginX) / BASE_CELL_SIZE;
      const ly = (sphereY - chunkOriginY) / BASE_CELL_SIZE;
      const lz = (pz - chunkOriginZ) / BASE_CELL_SIZE;

      if (lx < -0.5 || lx > 16.5 || ly < -0.5 || ly > 16.5 || lz < -0.5 || lz > 16.5) {
        continue;
      }

      const sdf = wasmQueryTrilinearSDF(lx, ly, lz);

      if (sIdx == 0) {
        // Track lowest sphere SDF for ground distance
        if (sdf < minGroundSdf) minGroundSdf = sdf;
      }

      // Penetration threshold: if distance to surface is less than capsule radius
      if (sdf < radius) {
        collisionCount++;

        // Surface normal estimation via central difference
        const eps: f32 = 0.05;
        const dX = wasmQueryTrilinearSDF((px + eps - chunkOriginX) / BASE_CELL_SIZE, ly, lz) -
                   wasmQueryTrilinearSDF((px - eps - chunkOriginX) / BASE_CELL_SIZE, ly, lz);
        const dY = wasmQueryTrilinearSDF(lx, (sphereY + eps - chunkOriginY) / BASE_CELL_SIZE, lz) -
                   wasmQueryTrilinearSDF(lx, (sphereY - eps - chunkOriginY) / BASE_CELL_SIZE, lz);
        const dZ = wasmQueryTrilinearSDF(lx, ly, (pz + eps - chunkOriginZ) / BASE_CELL_SIZE) -
                   wasmQueryTrilinearSDF(lx, ly, (pz - eps - chunkOriginZ) / BASE_CELL_SIZE);

        let nLen = Mathf.sqrt(dX * dX + dY * dY + dZ * dZ);
        if (nLen < 0.0001) nLen = 1.0;
        const nx = dX / nLen;
        const ny = dY / nLen;
        const nz = dZ / nLen;

        const penetration = radius - sdf;

        // Push capsule out along normal
        px += nx * penetration;
        py += ny * penetration;
        pz += nz * penetration;

        // Cancel velocity pointing into surface
        const vDotN = vx * nx + vy * ny + vz * nz;
        if (vDotN < 0.0) {
          vx -= vDotN * nx;
          vy -= vDotN * ny;
          vz -= vDotN * nz;
        }

        // Check if this contact is walkable ground (slope angle <= 45-50 deg: ny > 0.55)
        if (ny > 0.55) {
          isGrounded = 1;
          groundNx = nx;
          groundNy = ny;
          groundNz = nz;
          minGroundSdf = 0.0;
        }
      }
    }
  }

  // Write outputs to CAPSULE_RESULT_OFFSET (48 bytes)
  store<f32>(CAPSULE_RESULT_OFFSET, px);
  store<f32>(CAPSULE_RESULT_OFFSET + 4, py);
  store<f32>(CAPSULE_RESULT_OFFSET + 8, pz);

  store<f32>(CAPSULE_RESULT_OFFSET + 12, vx);
  store<f32>(CAPSULE_RESULT_OFFSET + 16, vy);
  store<f32>(CAPSULE_RESULT_OFFSET + 20, vz);

  store<f32>(CAPSULE_RESULT_OFFSET + 24, groundNx);
  store<f32>(CAPSULE_RESULT_OFFSET + 28, groundNy);
  store<f32>(CAPSULE_RESULT_OFFSET + 32, groundNz);

  store<f32>(CAPSULE_RESULT_OFFSET + 36, minGroundSdf);
  store<i32>(CAPSULE_RESULT_OFFSET + 40, isGrounded);
  store<i32>(CAPSULE_RESULT_OFFSET + 44, collisionCount);

  return isGrounded;
}

export function wasmGetCapsulePosX(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET); }
export function wasmGetCapsulePosY(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 4); }
export function wasmGetCapsulePosZ(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 8); }
export function wasmGetCapsuleVelX(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 12); }
export function wasmGetCapsuleVelY(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 16); }
export function wasmGetCapsuleVelZ(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 20); }
export function wasmGetCapsuleGroundNormalX(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 24); }
export function wasmGetCapsuleGroundNormalY(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 28); }
export function wasmGetCapsuleGroundNormalZ(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 32); }
export function wasmGetCapsuleGroundSDF(): f32 { return load<f32>(CAPSULE_RESULT_OFFSET + 36); }
export function wasmGetCapsuleGrounded(): i32 { return load<i32>(CAPSULE_RESULT_OFFSET + 40); }
export function wasmGetCapsuleCollisionCount(): i32 { return load<i32>(CAPSULE_RESULT_OFFSET + 44); }

// ---------------------------------------------------------------------------
// Feature-Preserving QEF (Quadratic Error Function) SVD Solver in Wasm
// ---------------------------------------------------------------------------

export function wasmQEFReset(): void {
  for (let i: i32 = 0; i < 16; ++i) {
    store<f32>(QEF_BUFFER_OFFSET + (i * 4), 0.0);
  }
}

export function wasmQEFAddPlane(
  px: f32, py: f32, pz: f32,
  nx: f32, ny: f32, nz: f32
): void {
  const ata_00 = load<f32>(QEF_BUFFER_OFFSET) + (nx * nx);
  const ata_01 = load<f32>(QEF_BUFFER_OFFSET + 4) + (nx * ny);
  const ata_02 = load<f32>(QEF_BUFFER_OFFSET + 8) + (nx * nz);
  const ata_11 = load<f32>(QEF_BUFFER_OFFSET + 12) + (ny * ny);
  const ata_12 = load<f32>(QEF_BUFFER_OFFSET + 16) + (ny * nz);
  const ata_22 = load<f32>(QEF_BUFFER_OFFSET + 20) + (nz * nz);

  const dot = nx * px + ny * py + nz * pz;
  const atb_0 = load<f32>(QEF_BUFFER_OFFSET + 24) + (dot * nx);
  const atb_1 = load<f32>(QEF_BUFFER_OFFSET + 28) + (dot * ny);
  const atb_2 = load<f32>(QEF_BUFFER_OFFSET + 32) + (dot * nz);

  const massX = load<f32>(QEF_BUFFER_OFFSET + 36) + px;
  const massY = load<f32>(QEF_BUFFER_OFFSET + 40) + py;
  const massZ = load<f32>(QEF_BUFFER_OFFSET + 44) + pz;
  const count = load<f32>(QEF_BUFFER_OFFSET + 48) + 1.0;

  store<f32>(QEF_BUFFER_OFFSET, ata_00);
  store<f32>(QEF_BUFFER_OFFSET + 4, ata_01);
  store<f32>(QEF_BUFFER_OFFSET + 8, ata_02);
  store<f32>(QEF_BUFFER_OFFSET + 12, ata_11);
  store<f32>(QEF_BUFFER_OFFSET + 16, ata_12);
  store<f32>(QEF_BUFFER_OFFSET + 20, ata_22);

  store<f32>(QEF_BUFFER_OFFSET + 24, atb_0);
  store<f32>(QEF_BUFFER_OFFSET + 28, atb_1);
  store<f32>(QEF_BUFFER_OFFSET + 32, atb_2);

  store<f32>(QEF_BUFFER_OFFSET + 36, massX);
  store<f32>(QEF_BUFFER_OFFSET + 40, massY);
  store<f32>(QEF_BUFFER_OFFSET + 44, massZ);
  store<f32>(QEF_BUFFER_OFFSET + 48, count);
}

export function wasmQEFSolve(
  minX: f32, minY: f32, minZ: f32,
  maxX: f32, maxY: f32, maxZ: f32
): i32 {
  const count = load<f32>(QEF_BUFFER_OFFSET + 48);
  if (count < 0.5) {
    store<f32>(QEF_BUFFER_OFFSET + 52, (minX + maxX) * 0.5);
    store<f32>(QEF_BUFFER_OFFSET + 56, (minY + maxY) * 0.5);
    store<f32>(QEF_BUFFER_OFFSET + 60, (minZ + maxZ) * 0.5);
    return 0;
  }

  const massPointX = load<f32>(QEF_BUFFER_OFFSET + 36) / count;
  const massPointY = load<f32>(QEF_BUFFER_OFFSET + 40) / count;
  const massPointZ = load<f32>(QEF_BUFFER_OFFSET + 44) / count;

  const lambda: f32 = 0.05;
  const a00 = load<f32>(QEF_BUFFER_OFFSET) + lambda;
  const a01 = load<f32>(QEF_BUFFER_OFFSET + 4);
  const a02 = load<f32>(QEF_BUFFER_OFFSET + 8);
  const a11 = load<f32>(QEF_BUFFER_OFFSET + 12) + lambda;
  const a12 = load<f32>(QEF_BUFFER_OFFSET + 16);
  const a22 = load<f32>(QEF_BUFFER_OFFSET + 20) + lambda;

  const b0 = load<f32>(QEF_BUFFER_OFFSET + 24) + (lambda * massPointX);
  const b1 = load<f32>(QEF_BUFFER_OFFSET + 28) + (lambda * massPointY);
  const b2 = load<f32>(QEF_BUFFER_OFFSET + 32) + (lambda * massPointZ);

  // Determinant of symmetric 3x3
  const det = a00 * (a11 * a22 - a12 * a12)
            - a01 * (a01 * a22 - a12 * a02)
            + a02 * (a01 * a12 - a11 * a02);

  let solX = massPointX;
  let solY = massPointY;
  let solZ = massPointZ;

  if (Mathf.abs(det) > 0.000001) {
    const invDet: f32 = 1.0 / det;

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

  const margin: f32 = 0.01;
  solX = Mathf.max(minX + margin, Mathf.min(maxX - margin, solX));
  solY = Mathf.max(minY + margin, Mathf.min(maxY - margin, solY));
  solZ = Mathf.max(minZ + margin, Mathf.min(maxZ - margin, solZ));

  store<f32>(QEF_BUFFER_OFFSET + 52, solX);
  store<f32>(QEF_BUFFER_OFFSET + 56, solY);
  store<f32>(QEF_BUFFER_OFFSET + 60, solZ);

  return 1;
}

export function wasmGetQEFResultX(): f32 { return load<f32>(QEF_BUFFER_OFFSET + 52); }
export function wasmGetQEFResultY(): f32 { return load<f32>(QEF_BUFFER_OFFSET + 56); }
export function wasmGetQEFResultZ(): f32 { return load<f32>(QEF_BUFFER_OFFSET + 60); }

// ---------------------------------------------------------------------------
// System 4: Metroidvania 2D Cellular Automata & A* Connectivity Graph in Wasm
// ---------------------------------------------------------------------------

export function getGrid2DBufferPtr(): i32 { return GRID2D_BUFFER_OFFSET; }

/**
 * Initializes a 2D tile grid with pseudo-random noise
 * 1 = Solid wall, 0 = Open air
 */
export function wasmInitGrid2D(width: i32, height: i32, fillPercent: f32, seed: u32): i32 {
  let rng = seed;
  let solidCount: i32 = 0;
  const total = width * height;

  for (let i: i32 = 0; i < total; ++i) {
    rng = (rng * 1664525 + 1013904223);
    const u = f32(rng & 0x7fffffff) / 2147483647.0;
    const isSolid: u8 = u < fillPercent ? 1 : 0;
    store<u8>(GRID2D_BUFFER_OFFSET + i, isSolid);
    if (isSolid == 1) solidCount++;
  }
  return solidCount;
}

/**
 * Multi-pass Cellular Automata cave smoothing in WebAssembly
 * Double-buffered between GRID2D_BUFFER_OFFSET and GRID2D_TEMP_OFFSET
 */
export function wasmRunCellularAutomata(
  width: i32, height: i32,
  birthLimit: i32, deathLimit: i32,
  iterations: i32
): i32 {
  for (let iter: i32 = 0; iter < iterations; ++iter) {
    for (let y: i32 = 0; y < height; ++y) {
      for (let x: i32 = 0; x < width; ++x) {
        let wallCount: i32 = 0;
        for (let ny: i32 = y - 1; ny <= y + 1; ++ny) {
          for (let nx: i32 = x - 1; nx <= x + 1; ++nx) {
            if (nx == x && ny == y) continue;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              wallCount++;
            } else {
              const val = load<u8>(GRID2D_BUFFER_OFFSET + (ny * width + nx));
              if (val == 1) wallCount++;
            }
          }
        }

        const current = load<u8>(GRID2D_BUFFER_OFFSET + (y * width + x));
        let nextVal: u8 = 0;
        if (current == 1) {
          nextVal = wallCount >= deathLimit ? 1 : 0;
        } else {
          nextVal = wallCount > birthLimit ? 1 : 0;
        }

        if (x == 0 || x == width - 1 || y == 0 || y == height - 1) {
          nextVal = 1;
        }

        store<u8>(GRID2D_TEMP_OFFSET + (y * width + x), nextVal);
      }
    }

    for (let i: i32 = 0; i < width * height; ++i) {
      store<u8>(GRID2D_BUFFER_OFFSET + i, load<u8>(GRID2D_TEMP_OFFSET + i));
    }
  }

  let openAir: i32 = 0;
  for (let i: i32 = 0; i < width * height; ++i) {
    if (load<u8>(GRID2D_BUFFER_OFFSET + i) == 0) openAir++;
  }
  return openAir;
}

/**
 * Fast Breadth-First / A* connectivity verification between two rooms/cells
 * Returns shortest path distance, or -1 if unreachable
 */
export function wasmCheckConnectivityAStar(
  width: i32, height: i32,
  startX: i32, startY: i32,
  targetX: i32, targetY: i32
): i32 {
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return -1;
  if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) return -1;

  if (load<u8>(GRID2D_BUFFER_OFFSET + (startY * width + startX)) == 1) return -1;
  if (load<u8>(GRID2D_BUFFER_OFFSET + (targetY * width + targetX)) == 1) return -1;

  if (startX == targetX && startY == targetY) return 0;

  const totalCells = width * height;
  for (let i: i32 = 0; i < totalCells; ++i) {
    store<i16>(GRID2D_TEMP_OFFSET + (i * 2), -1);
  }

  let queueHead: i32 = 0;
  let queueTail: i32 = 0;
  const maxQueue = 8192;

  store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4), i16(startX));
  store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4) + 2, i16(startY));
  queueTail++;

  store<i16>(GRID2D_TEMP_OFFSET + ((startY * width + startX) * 2), 0);

  while (queueHead < queueTail && queueTail < maxQueue) {
    const cx = i32(load<i16>(ASTAR_QUEUE_OFFSET + (queueHead * 4)));
    const cy = i32(load<i16>(ASTAR_QUEUE_OFFSET + (queueHead * 4) + 2));
    queueHead++;

    const currentDist = load<i16>(GRID2D_TEMP_OFFSET + ((cy * width + cx) * 2));

    if (cx == targetX && cy == targetY) {
      return i32(currentDist);
    }

    // 4 cardinal neighbors (unrolled zero-allocation)
    // Right (+1, 0)
    if (cx + 1 < width && load<u8>(GRID2D_BUFFER_OFFSET + (cy * width + cx + 1)) == 0) {
      const idx = (cy * width + cx + 1) * 2;
      if (load<i16>(GRID2D_TEMP_OFFSET + idx) < 0) {
        store<i16>(GRID2D_TEMP_OFFSET + idx, currentDist + 1);
        if (queueTail < maxQueue) {
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4), i16(cx + 1));
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4) + 2, i16(cy));
          queueTail++;
        }
      }
    }
    // Left (-1, 0)
    if (cx - 1 >= 0 && load<u8>(GRID2D_BUFFER_OFFSET + (cy * width + cx - 1)) == 0) {
      const idx = (cy * width + cx - 1) * 2;
      if (load<i16>(GRID2D_TEMP_OFFSET + idx) < 0) {
        store<i16>(GRID2D_TEMP_OFFSET + idx, currentDist + 1);
        if (queueTail < maxQueue) {
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4), i16(cx - 1));
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4) + 2, i16(cy));
          queueTail++;
        }
      }
    }
    // Down (0, +1)
    if (cy + 1 < height && load<u8>(GRID2D_BUFFER_OFFSET + ((cy + 1) * width + cx)) == 0) {
      const idx = ((cy + 1) * width + cx) * 2;
      if (load<i16>(GRID2D_TEMP_OFFSET + idx) < 0) {
        store<i16>(GRID2D_TEMP_OFFSET + idx, currentDist + 1);
        if (queueTail < maxQueue) {
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4), i16(cx));
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4) + 2, i16(cy + 1));
          queueTail++;
        }
      }
    }
    // Up (0, -1)
    if (cy - 1 >= 0 && load<u8>(GRID2D_BUFFER_OFFSET + ((cy - 1) * width + cx)) == 0) {
      const idx = ((cy - 1) * width + cx) * 2;
      if (load<i16>(GRID2D_TEMP_OFFSET + idx) < 0) {
        store<i16>(GRID2D_TEMP_OFFSET + idx, currentDist + 1);
        if (queueTail < maxQueue) {
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4), i16(cx));
          store<i16>(ASTAR_QUEUE_OFFSET + (queueTail * 4) + 2, i16(cy - 1));
          queueTail++;
        }
      }
    }
  }

  return -1;
}

// ---------------------------------------------------------------------------
// System 5: Two-Bone & Multi-Bone CCD Inverse Kinematics in Wasm
// ---------------------------------------------------------------------------

export function getIKChainBufferPtr(): i32 { return IK_CHAIN_OFFSET; }
export function getIKResultBufferPtr(): i32 { return IK_RESULT_OFFSET; }

const RAD_TO_DEG: f32 = 57.29577951308232;
const DEG_TO_RAD: f32 = 0.017453292519943295;

@inline
function normalizeAngleDeg(deg: f32): f32 {
  let angle = deg % 360.0;
  if (angle > 180.0) angle -= 360.0;
  if (angle < -180.0) angle += 360.0;
  return angle;
}

/**
 * Analytical Two-Bone Inverse Kinematics (Law of Cosines) in WebAssembly
 */
export function wasmSolveTwoBoneIK(
  rootX: f32, rootY: f32,
  targetX: f32, targetY: f32,
  length1: f32, length2: f32,
  flipBend: i32
): i32 {
  const dx = targetX - rootX;
  const dy = targetY - rootY;
  const dist = Mathf.sqrt(dx * dx + dy * dy);
  const targetAngleDeg = Mathf.atan2(dy, dx) * RAD_TO_DEG;

  const maxReach = length1 + length2;
  const minReach = Mathf.abs(length1 - length2);

  let world1: f32 = targetAngleDeg;
  let world2: f32 = targetAngleDeg;
  let reached: i32 = 1;

  if (dist >= maxReach - 0.001) {
    reached = 0;
  } else if (dist <= minReach + 0.001) {
    world2 = normalizeAngleDeg(targetAngleDeg + 180.0);
    reached = 0;
  } else {
    const cosAlpha = Mathf.max(-1.0, Mathf.min(1.0, (length1 * length1 + dist * dist - length2 * length2) / (2.0 * length1 * dist)));
    const alphaDeg = Mathf.acos(cosAlpha) * RAD_TO_DEG;

    const cosBeta = Mathf.max(-1.0, Mathf.min(1.0, (length1 * length1 + length2 * length2 - dist * dist) / (2.0 * length1 * length2)));
    const betaDeg = Mathf.acos(cosBeta) * RAD_TO_DEG;

    let local2: f32 = 0.0;
    if (flipBend == 0) {
      world1 = normalizeAngleDeg(targetAngleDeg - alphaDeg);
      local2 = normalizeAngleDeg(180.0 - betaDeg);
    } else {
      world1 = normalizeAngleDeg(targetAngleDeg + alphaDeg);
      local2 = normalizeAngleDeg(-(180.0 - betaDeg));
    }
    world2 = normalizeAngleDeg(world1 + local2);
  }

  store<f32>(IK_RESULT_OFFSET, world1);
  store<f32>(IK_RESULT_OFFSET + 4, world2);
  store<i32>(IK_RESULT_OFFSET + 8, reached);

  return reached;
}

export function wasmGetIKAngle1(): f32 { return load<f32>(IK_RESULT_OFFSET); }
export function wasmGetIKAngle2(): f32 { return load<f32>(IK_RESULT_OFFSET + 4); }
export function wasmGetIKReached(): i32 { return load<i32>(IK_RESULT_OFFSET + 8); }

export function wasmSetIKChainBone(
  index: i32,
  length: f32,
  angleDeg: f32,
  minAngle: f32,
  maxAngle: f32
): void {
  if (index < 0 || index >= 32) return;
  const offset = IK_CHAIN_OFFSET + (index * 16);
  store<f32>(offset, length);
  store<f32>(offset + 4, angleDeg);
  store<f32>(offset + 8, minAngle);
  store<f32>(offset + 12, maxAngle);
}

export function wasmSolveCCDIK(
  boneCount: i32,
  targetX: f32, targetY: f32,
  rootX: f32, rootY: f32,
  maxIterations: i32,
  tolerance: f32
): i32 {
  if (boneCount <= 0 || boneCount > 32) return 0;

  for (let iter: i32 = 0; iter < maxIterations; ++iter) {
    let curX = rootX;
    let curY = rootY;
    let curAngle: f32 = 0.0;

    for (let b: i32 = 0; b < boneCount; ++b) {
      const bOffset = IK_CHAIN_OFFSET + (b * 16);
      const len = load<f32>(bOffset);
      const angle = load<f32>(bOffset + 4);
      curAngle += angle;
      curX += len * Mathf.cos(curAngle * DEG_TO_RAD);
      curY += len * Mathf.sin(curAngle * DEG_TO_RAD);
    }

    const tipDist = Mathf.sqrt((targetX - curX) * (targetX - curX) + (targetY - curY) * (targetY - curY));
    if (tipDist < tolerance) return 1;

    for (let b: i32 = boneCount - 1; b >= 0; --b) {
      let jointX = rootX;
      let jointY = rootY;
      let jointAngle: f32 = 0.0;

      for (let j: i32 = 0; j < b; ++j) {
        const jOffset = IK_CHAIN_OFFSET + (j * 16);
        jointAngle += load<f32>(jOffset + 4);
        jointX += load<f32>(jOffset) * Mathf.cos(jointAngle * DEG_TO_RAD);
        jointY += load<f32>(jOffset) * Mathf.sin(jointAngle * DEG_TO_RAD);
      }

      const toTipX = curX - jointX;
      const toTipY = curY - jointY;
      const angleTip = Mathf.atan2(toTipY, toTipX) * RAD_TO_DEG;

      const toTargetX = targetX - jointX;
      const toTargetY = targetY - jointY;
      const angleTarget = Mathf.atan2(toTargetY, toTargetX) * RAD_TO_DEG;

      const deltaAngle = normalizeAngleDeg(angleTarget - angleTip);

      const bOffset = IK_CHAIN_OFFSET + (b * 16);
      let angle = load<f32>(bOffset + 4) + deltaAngle;
      const minAng = load<f32>(bOffset + 8);
      const maxAng = load<f32>(bOffset + 12);

      if (minAng < maxAng) {
        angle = Mathf.max(minAng, Mathf.min(maxAng, angle));
      }

      store<f32>(bOffset + 4, normalizeAngleDeg(angle));

      curX = rootX;
      curY = rootY;
      curAngle = 0.0;
      for (let k: i32 = 0; k < boneCount; ++k) {
        const kOffset = IK_CHAIN_OFFSET + (k * 16);
        curAngle += load<f32>(kOffset + 4);
        curX += load<f32>(kOffset) * Mathf.cos(curAngle * DEG_TO_RAD);
        curY += load<f32>(kOffset) * Mathf.sin(curAngle * DEG_TO_RAD);
      }
    }
  }

  return 0;
}

export function wasmGetIKBoneAngle(index: i32): f32 {
  if (index < 0 || index >= 32) return 0.0;
  return load<f32>(IK_CHAIN_OFFSET + (index * 16) + 4);
}

// ---------------------------------------------------------------------------
// System 6: High-Density 2D Particle Engine Batch Integration in Wasm
// ---------------------------------------------------------------------------

let active2DParticleCount: i32 = 0;
let rngSeed2D: u32 = 987654321;

export function getParticle2DBufferPtr(): i32 { return PARTICLE2D_BUFFER_OFFSET; }
export function getActive2DParticleCount(): i32 { return active2DParticleCount; }
export function wasmClear2DParticles(): void { active2DParticleCount = 0; }

@inline
function nextRng2D(): f32 {
  rngSeed2D = (rngSeed2D * 1664525 + 1013904223);
  return f32(rngSeed2D & 0x7fffffff) / 2147483647.0;
}

export function wasmSpawn2DParticle(
  x: f32, y: f32,
  vx: f32, vy: f32,
  maxLife: f32, size: f32
): i32 {
  if (active2DParticleCount >= MAX_2D_PARTICLES) return active2DParticleCount;
  const offset = PARTICLE2D_BUFFER_OFFSET + (active2DParticleCount * 32);

  store<f32>(offset, x);
  store<f32>(offset + 4, y);
  store<f32>(offset + 8, vx);
  store<f32>(offset + 12, vy);
  store<f32>(offset + 16, 0.0);
  store<f32>(offset + 20, maxLife > 0.05 ? maxLife : 1.0);
  store<f32>(offset + 24, size > 0.1 ? size : 4.0);
  store<i32>(offset + 28, 0);

  active2DParticleCount++;
  return active2DParticleCount;
}

export function wasmSpawn2DBurst(
  x: f32, y: f32,
  count: i32,
  speed: f32,
  spread: f32
): i32 {
  let spawned: i32 = 0;
  for (let i: i32 = 0; i < count; ++i) {
    if (active2DParticleCount >= MAX_2D_PARTICLES) break;
    const angle = (nextRng2D() - f32(0.5)) * spread - f32(1.5707963);
    const spd = speed * (f32(0.6) + nextRng2D() * f32(0.8));
    const vx = Mathf.cos(angle) * spd;
    const vy = Mathf.sin(angle) * spd;
    const life = f32(0.8) + nextRng2D() * f32(1.2);
    const size = f32(3.0) + nextRng2D() * f32(4.0);

    wasmSpawn2DParticle(x, y, vx, vy, life, size);
    spawned++;
  }
  return spawned;
}

export function wasmUpdate2DParticles(
  dt: f32,
  gravityX: f32,
  gravityY: f32,
  drag: f32,
  floorY: f32,
  bounce: f32
): i32 {
  for (let i: i32 = active2DParticleCount - 1; i >= 0; --i) {
    const offset = PARTICLE2D_BUFFER_OFFSET + (i * 32);

    let life = load<f32>(offset + 16);
    const maxLife = load<f32>(offset + 20);
    life += dt / maxLife;

    if (life >= 1.0) {
      const last = active2DParticleCount - 1;
      if (i != last) {
        const lastOffset = PARTICLE2D_BUFFER_OFFSET + (last * 32);
        for (let b: i32 = 0; b < 8; ++b) {
          store<f32>(offset + (b * 4), load<f32>(lastOffset + (b * 4)));
        }
      }
      active2DParticleCount--;
      continue;
    }

    store<f32>(offset + 16, life);

    let x = load<f32>(offset);
    let y = load<f32>(offset + 4);
    let vx = load<f32>(offset + 8);
    let vy = load<f32>(offset + 12);

    vx *= (1.0 - (drag * dt));
    vy *= (1.0 - (drag * dt));

    vx += gravityX * dt;
    vy += gravityY * dt;

    x += vx * dt;
    y += vy * dt;

    if (y >= floorY && vy > 0.0) {
      y = floorY;
      vy = -vy * bounce;
      vx *= 0.8;
    }

    store<f32>(offset, x);
    store<f32>(offset + 4, y);
    store<f32>(offset + 8, vx);
    store<f32>(offset + 12, vy);
  }

  return active2DParticleCount;
}

