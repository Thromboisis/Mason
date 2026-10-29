// Automated test suite for WebAssembly Voxel Core Engine
// Tests Procedural Terrain, Multi-LOD Surface Nets, and Watertight Boundary Skirt Extrusion
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runWasmBoundarySkirtTest() {
  console.log('[Test] Loading public/wasm/voxelCore.wasm...');
  const wasmPath = path.join(__dirname, 'public/wasm/voxelCore.wasm');
  const wasmBytes = fs.readFileSync(wasmPath);

  const wasmModule = await WebAssembly.instantiate(wasmBytes, {
    env: {
      abort: (_msg, _file, line, col) => {
        console.error(`[Wasm Abort] line ${line}:${col}`);
      }
    }
  });

  const exports = wasmModule.instance.exports;
  console.log('[Test] WASM Module loaded successfully. Exports available.');

  // 1. Generate Procedural Terrain for chunk (0, 0, 0)
  const solidCount = exports.wasmGenerateProceduralTerrain(0, 0, 0);
  console.log(`[Test] wasmGenerateProceduralTerrain(0, 0, 0) created ${solidCount} solid voxels.`);
  if (solidCount <= 0) {
    throw new Error('Terrain generation produced 0 solid voxels!');
  }

  // 2. Extract without skirts (generateSkirts = 0)
  const trisWithoutSkirts = exports.wasmExtractSurfaceNetsLOD(0, 1, 0);
  const vertsWithoutSkirts = exports.getExtractedVertexCount();
  const baseTris = exports.getExtractedBaseTriangleCount();
  const skirtTrisNone = exports.getExtractedSkirtTriangleCount();

  console.log(`[Test LOD 0 - No Skirts] Total Tris: ${trisWithoutSkirts}, Verts: ${vertsWithoutSkirts}, Skirt Tris: ${skirtTrisNone}`);
  if (skirtTrisNone !== 0) {
    throw new Error(`Expected 0 skirt triangles when generateSkirts=0, got ${skirtTrisNone}`);
  }

  // 3. Extract with skirts (generateSkirts = 1) at depth factor 1.25
  exports.wasmSetSkirtDepth(1.25);
  const trisWithSkirts = exports.wasmExtractSurfaceNetsLOD(0, 1, 1);
  const vertsWithSkirts = exports.getExtractedVertexCount();
  const skirtTris = exports.getExtractedSkirtTriangleCount();
  const skirtVerts = exports.getExtractedSkirtVertexCount();

  console.log(`[Test LOD 0 - With Skirts (1.25x)] Total Tris: ${trisWithSkirts}, Verts: ${vertsWithSkirts}, Skirt Tris: ${skirtTris}, Skirt Verts: ${skirtVerts}`);
  if (skirtTris <= 0) {
    throw new Error('Expected skirt triangles > 0 when generateSkirts=1 on chunk boundary!');
  }
  if (vertsWithSkirts <= vertsWithoutSkirts) {
    throw new Error('Expected vertex count with skirts to be greater than without skirts!');
  }
  if (trisWithSkirts !== (baseTris + skirtTris)) {
    throw new Error(`Triangles mismatch: total=${trisWithSkirts}, base=${baseTris}, skirt=${skirtTris}`);
  }

  // 4. Test Skirt Depth Adjustment (2.5x)
  exports.wasmSetSkirtDepth(2.5);
  const trisDeepSkirts = exports.wasmExtractSurfaceNetsLOD(0, 1, 1);
  const skirtTrisDeep = exports.getExtractedSkirtTriangleCount();
  console.log(`[Test LOD 0 - Deep Skirts (2.5x)] Total Tris: ${trisDeepSkirts}, Skirt Tris: ${skirtTrisDeep}`);
  if (skirtTrisDeep !== skirtTris) {
    throw new Error(`Expected topological skirt quad count to match (${skirtTris}), got ${skirtTrisDeep}`);
  }

  // 5. Test Cascaded Multi-LOD Skirt Extrusion (LOD 1, 2, 3)
  for (let lod = 1; lod <= 3; lod++) {
    const trisLod = exports.wasmExtractSurfaceNetsLOD(lod, 1, 1);
    const skirtTrisLod = exports.getExtractedSkirtTriangleCount();
    const skirtVertsLod = exports.getExtractedSkirtVertexCount();
    console.log(`[Test LOD ${lod} - With Skirts] Total Tris: ${trisLod}, Skirt Tris: ${skirtTrisLod}, Skirt Verts: ${skirtVertsLod}`);
  }

  // 6. Test WebAssembly Kinematic Character Controller (KCC) Swept Capsule Collision
  console.log('\n[Test 6] Testing WebAssembly KCC Swept Capsule Solver...');
  // Capsule at (0.5, 1.2, 1.5) over ground at y=0.75m with radius 0.35, height 1.0 falling downwards
  const groundedResult = exports.wasmResolveCapsuleStep(
    0.5, 1.2, 1.5,   // Center above terrain surface
    0.0, -2.0, 0.0,  // Downward velocity
    0.35, 1.0,       // radius 0.35m, height 1.0m
    0.016,           // dt 16ms
    18.0,            // gravity
    0.0, 0.0, 0.0    // chunk origin
  );

  const finalPosY = exports.wasmGetCapsulePosY();
  const finalVelY = exports.wasmGetCapsuleVelY();
  const groundNormY = exports.wasmGetCapsuleGroundNormalY();
  const isGrounded = exports.wasmGetCapsuleGrounded();
  const colCount = exports.wasmGetCapsuleCollisionCount();

  console.log(`[Test KCC] Final PosY: ${finalPosY.toFixed(3)}, VelY: ${finalVelY.toFixed(3)}, NormY: ${groundNormY.toFixed(3)}, Grounded: ${isGrounded}, Collisions: ${colCount}`);

  if (isGrounded !== 1) {
    throw new Error(`Expected isGrounded=1 on terrain surface, got ${isGrounded}`);
  }
  if (groundNormY < 0.5) {
    throw new Error(`Expected upward surface normal (Ny > 0.5), got ${groundNormY}`);
  }

  // 7. Test WebAssembly Feature-Preserving QEF (Quadratic Error Function) Solver
  console.log('\n[Test 7] Testing WebAssembly QEF SVD Solver for sharp features...');
  exports.wasmQEFReset();

  // Add 3 intersecting coordinate planes at corner (2.0, 3.0, 2.0):
  // Plane 1: normal (1, 0, 0) through (2.0, 3.0, 2.0)
  exports.wasmQEFAddPlane(2.0, 3.0, 2.0, 1.0, 0.0, 0.0);
  // Plane 2: normal (0, 1, 0) through (2.0, 3.0, 2.0)
  exports.wasmQEFAddPlane(2.0, 3.0, 2.0, 0.0, 1.0, 0.0);
  // Plane 3: normal (0, 0, 1) through (2.0, 3.0, 2.0)
  exports.wasmQEFAddPlane(2.0, 3.0, 2.0, 0.0, 0.0, 1.0);

  const qefSuccess = exports.wasmQEFSolve(
    1.75, 2.75, 1.75, // minBound of cell
    2.25, 3.25, 2.25  // maxBound of cell
  );

  const solX = exports.wasmGetQEFResultX();
  const solY = exports.wasmGetQEFResultY();
  const solZ = exports.wasmGetQEFResultZ();

  console.log(`[Test QEF] Corner Solve Success: ${qefSuccess}, Optimal Point: (${solX.toFixed(3)}, ${solY.toFixed(3)}, ${solZ.toFixed(3)})`);

  if (Math.abs(solX - 2.0) > 0.05 || Math.abs(solY - 3.0) > 0.05 || Math.abs(solZ - 2.0) > 0.05) {
    throw new Error(`Expected QEF solution near (2.0, 3.0, 2.0), got (${solX}, ${solY}, ${solZ})`);
  }

  // 8. Test WebAssembly Inline Prop Shielding & CSG Exclusion Masking
  console.log('\n[Test 8] Testing WebAssembly Inline Prop Shielding...');
  exports.wasmClearShields();
  // Register active shield totem at (2.0, 2.0, 2.0) with radius 2.0 and durability 100
  exports.wasmAddShield(2.0, 2.0, 2.0, 2.0, 100.0);
  const activeShields = exports.getActiveShieldCount();
  console.log(`[Test Shield] Active shields registered: ${activeShields}`);
  if (activeShields !== 1) throw new Error(`Expected 1 shield, got ${activeShields}`);

  // Stamp a low-yield blast (damage 40 <= durability 100) -> must be blocked
  exports.wasmApplyBrushWithDamage(
    0, // Sphere
    0, // Carve
    2.0, 2.0, 2.0, // Center
    1.5, 0.0,      // Radius 1.5
    0.0, 0.0, 0.0, // Chunk origin
    40.0           // Damage 40
  );
  const blockedCount = exports.wasmGetShieldBlockedCount();
  console.log(`[Test Shield] Shield blocked voxel carve count: ${blockedCount}`);
  if (blockedCount <= 0) throw new Error('Expected shield to block carve attempts inside protection radius!');

  // 9. Test WebAssembly Metroidvania 2D Cellular Automata & A* Reachability
  console.log('\n[Test 9] Testing WebAssembly Metroidvania 2D Cellular Automata & A*...');
  const gridW = 32;
  const gridH = 32;
  const initialSolids = exports.wasmInitGrid2D(gridW, gridH, 0.45, 12345);
  console.log(`[Test 2D Grid] Seeded initial solids: ${initialSolids} / ${gridW * gridH}`);

  const openTiles = exports.wasmRunCellularAutomata(gridW, gridH, 4, 4, 4);
  console.log(`[Test Cellular Automata] 4-pass smoothed open air tiles: ${openTiles}`);
  if (openTiles <= 0) throw new Error('Cellular automata smoothed entire grid to 100% solid!');

  // Test A* reachability on 2D grid
  // Carve a guaranteed horizontal corridor between (2, 16) and (10, 16)
  const gridPtr = exports.getGrid2DBufferPtr();
  const memBytes = new Uint8Array(exports.memory.buffer);
  for (let x = 2; x <= 10; x++) {
    memBytes[gridPtr + (16 * gridW + x)] = 0; // 0 = air
  }
  const pathDist = exports.wasmCheckConnectivityAStar(gridW, gridH, 2, 16, 10, 16);
  console.log(`[Test A* Corridor] Path distance between (2,16) and (10,16): ${pathDist}`);
  if (pathDist !== 8) {
    throw new Error(`Expected direct corridor path distance 8, got ${pathDist}`);
  }

  // 10. Test WebAssembly Two-Bone & Multi-Bone CCD Inverse Kinematics
  console.log('\n[Test 10] Testing WebAssembly Two-Bone & Multi-Bone CCD IK...');
  // Two-Bone IK: root at (0, 0), target at (10, 10), length1=8, length2=8
  const ikReached = exports.wasmSolveTwoBoneIK(0.0, 0.0, 10.0, 10.0, 8.0, 8.0, 0);
  const ang1 = exports.wasmGetIKAngle1();
  const ang2 = exports.wasmGetIKAngle2();
  console.log(`[Test Two-Bone IK] Target (10, 10), Reached: ${ikReached}, Angle1: ${ang1.toFixed(1)}°, Angle2: ${ang2.toFixed(1)}°`);
  if (ikReached !== 1) throw new Error('Expected reachable Two-Bone IK target!');

  // CCD IK: 3-bone chain (arm) reaching for (25, 5)
  exports.wasmSetIKChainBone(0, 10.0, 0.0, -90.0, 90.0);
  exports.wasmSetIKChainBone(1, 10.0, 0.0, -120.0, 120.0);
  exports.wasmSetIKChainBone(2, 8.0, 0.0, -90.0, 90.0);
  const ccdSolved = exports.wasmSolveCCDIK(3, 22.0, 5.0, 0.0, 0.0, 20, 0.5);
  console.log(`[Test CCD IK] 3-bone chain reached target: ${ccdSolved}`);

  // 11. Test WebAssembly High-Density 2D Particle Engine
  console.log('\n[Test 11] Testing WebAssembly High-Density 2D Particle Engine...');
  exports.wasmClear2DParticles();
  const spawned2D = exports.wasmSpawn2DBurst(100.0, 100.0, 50, 60.0, 1.2);
  console.log(`[Test 2D Particles] Spawned burst: ${spawned2D}`);
  if (spawned2D !== 50) throw new Error(`Expected 50 spawned particles, got ${spawned2D}`);

  // Step simulation by 3 frames with gravity and floor bounce at y=200
  const activeRemaining = exports.wasmUpdate2DParticles(0.033, 0.0, 180.0, 0.05, 200.0, 0.5);
  console.log(`[Test 2D Particles] Active after integration: ${activeRemaining}`);
  if (activeRemaining <= 0) throw new Error('Particles prematurely died during step!');

  console.log('\n[SUCCESS] ALL 11 WebAssembly Engine Subsystems Passed Cleanly!\n');
}

runWasmBoundarySkirtTest().catch(err => {
  console.error('[FAILED] Test error:', err);
  process.exit(1);
});
