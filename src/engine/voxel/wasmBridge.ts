/**
 * WebAssembly (WASM) Bridge for Voxel Engine
 * 
 * Manages:
 * 1. Asynchronous instantiation of public/wasm/voxelCore.wasm
 * 2. Shared linear memory buffers (Int8Array chunk SDF, Float32Array vertices/normals, Uint32Array indices)
 * 3. High-throughput Wasm execution of Hermite SDF CSG brush stamps and Surface Nets extraction
 * 4. Microsecond performance telemetry and seamless TypeScript fallback
 */

import { VoxelChunkData, VoxelMesh, CSGBrushEvent } from './voxelTypes';
import { SurfaceNetsExtractor } from './surfaceNetsExtractor';
import { applyBrushToChunk } from './csgBrushEngine';

export interface ChunkCoord3D {
  x: number;
  y: number;
  z: number;
}

export interface VoxelWasmTelemetry {
  isWasmActive: boolean;
  binarySizeBytes: number;
  linearMemoryKb: number;
  lastMeshExtractionTimeUs: number;
  lastBrushStampTimeUs: number;
  lastTerrainGenTimeUs: number;
  lastRaymarchTimeUs: number;
  lastPhysicsTimeUs: number;
  activePhysicsParticles: number;
  totalSkirtTriangles: number;
  totalWasmInvocations: number;
}

interface WasmVoxelExports {
  memory: WebAssembly.Memory;
  getChunkBufferPtr(): number;
  getMaterialBufferPtr(): number;
  getRayResultPtr(): number;
  getVertexBufferPtr(): number;
  getNormalBufferPtr(): number;
  getIndexBufferPtr(): number;
  getExtractedVertexCount(): number;
  getExtractedIndexCount(): number;
  getExtractedSkirtTriangleCount(): number;
  getExtractedSkirtVertexCount(): number;
  getExtractedBaseTriangleCount(): number;
  wasmSetSkirtDepth(depthFactor: number): void;
  getParticleBufferPtr(): number;
  getActiveParticleCount(): number;
  wasmClearParticles(): void;
  wasmSpawnParticle(
    px: number, py: number, pz: number,
    vx: number, vy: number, vz: number,
    cr: number, cg: number, cb: number,
    maxLife: number, size: number
  ): number;
  wasmSpawnDebrisBurst(
    ox: number, oy: number, oz: number,
    count: number,
    cr: number, cg: number, cb: number,
    baseSpeed: number
  ): number;
  wasmUpdateParticles(
    dt: number,
    gravity: number,
    bounceTerrain: number
  ): number;
  wasmApplyBrush(
    shape: number,
    op: number,
    brushCenterX: number,
    brushCenterY: number,
    brushCenterZ: number,
    radius: number,
    height: number,
    chunkWorldX: number,
    chunkWorldY: number,
    chunkWorldZ: number
  ): number;
  wasmExtractSurfaceNets(quantizeNormals: number, generateSkirts: number): number;
  wasmExtractSurfaceNetsLOD(lod: number, quantizeNormals: number, generateSkirts: number): number;
  wasmDownsampleSDF(factor: number): number;
  wasmGenerateProceduralTerrain(cx: number, cy: number, cz: number): number;
  wasmQueryTrilinearSDF(lx: number, ly: number, lz: number): number;
  wasmRaymarchChunk(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDist: number
  ): number;
  getCapsuleResultPtr(): number;
  wasmResolveCapsuleStep(
    posX: number, posY: number, posZ: number,
    velX: number, velY: number, velZ: number,
    radius: number, height: number,
    dt: number,
    gravity: number,
    chunkOriginX: number, chunkOriginY: number, chunkOriginZ: number
  ): number;
  wasmGetCapsulePosX(): number;
  wasmGetCapsulePosY(): number;
  wasmGetCapsulePosZ(): number;
  wasmGetCapsuleVelX(): number;
  wasmGetCapsuleVelY(): number;
  wasmGetCapsuleVelZ(): number;
  wasmGetCapsuleGroundNormalX(): number;
  wasmGetCapsuleGroundNormalY(): number;
  wasmGetCapsuleGroundNormalZ(): number;
  wasmGetCapsuleGroundSDF(): number;
  wasmGetCapsuleGrounded(): number;
  wasmGetCapsuleCollisionCount(): number;
  getQEFBufferPtr(): number;
  wasmQEFReset(): void;
  wasmQEFAddPlane(
    px: number, py: number, pz: number,
    nx: number, ny: number, nz: number
  ): void;
  wasmQEFSolve(
    minX: number, minY: number, minZ: number,
    maxX: number, maxY: number, maxZ: number
  ): number;
  wasmGetQEFResultX(): number;
  wasmGetQEFResultY(): number;
  wasmGetQEFResultZ(): number;

  // System 3: Prop Shielding
  getShieldBufferPtr(): number;
  getActiveShieldCount(): number;
  wasmGetShieldBlockedCount(): number;
  wasmClearShields(): void;
  wasmAddShield(posX: number, posY: number, posZ: number, radius: number, durability: number): number;
  wasmApplyBrushWithDamage(
    shape: number, op: number,
    brushCenterX: number, brushCenterY: number, brushCenterZ: number,
    radius: number, height: number,
    chunkWorldX: number, chunkWorldY: number, chunkWorldZ: number,
    brushDamage: number
  ): number;

  // System 4: Metroidvania 2D Cellular Automata & A*
  getGrid2DBufferPtr(): number;
  wasmInitGrid2D(width: number, height: number, fillPercent: number, seed: number): number;
  wasmRunCellularAutomata(width: number, height: number, birthLimit: number, deathLimit: number, iterations: number): number;
  wasmCheckConnectivityAStar(width: number, height: number, startX: number, startY: number, targetX: number, targetY: number): number;

  // System 5: Two-Bone & Multi-Bone CCD IK
  getIKChainBufferPtr(): number;
  getIKResultBufferPtr(): number;
  wasmSolveTwoBoneIK(rootX: number, rootY: number, targetX: number, targetY: number, length1: number, length2: number, flipBend: number): number;
  wasmGetIKAngle1(): number;
  wasmGetIKAngle2(): number;
  wasmGetIKReached(): number;
  wasmSetIKChainBone(index: number, length: number, angleDeg: number, minAngle: number, maxAngle: number): void;
  wasmSolveCCDIK(boneCount: number, targetX: number, targetY: number, rootX: number, rootY: number, maxIterations: number, tolerance: number): number;
  wasmGetIKBoneAngle(index: number): number;

  // System 6: High-Density 2D Particle Engine
  getParticle2DBufferPtr(): number;
  getActive2DParticleCount(): number;
  wasmClear2DParticles(): void;
  wasmSpawn2DParticle(x: number, y: number, vx: number, vy: number, maxLife: number, size: number): number;
  wasmSpawn2DBurst(x: number, y: number, count: number, speed: number, spread: number): number;
  wasmUpdate2DParticles(dt: number, gravityX: number, gravityY: number, drag: number, floorY: number, bounce: number): number;
}

export interface CapsuleStepResult {
  pos: [number, number, number];
  vel: [number, number, number];
  groundNormal: [number, number, number];
  groundSdf: number;
  isGrounded: boolean;
  collisionCount: number;
}

class VoxelWasmBridge {
  private instance: WasmVoxelExports | null = null;
  private memory: WebAssembly.Memory | null = null;
  private isLoaded = false;
  private initPromise: Promise<boolean> | null = null;
  private binarySize = 13000; // ~13 KB
  private totalInvocations = 0;
  private lastMeshExtractionUs = 0;
  private lastBrushStampUs = 0;
  private lastTerrainGenUs = 0;
  private lastRaymarchUs = 0;
  private lastPhysicsUs = 0;
  private totalSkirtTriangles = 0;

  private fallbackExtractor = new SurfaceNetsExtractor();

  /**
   * Initialize and load the WebAssembly binary
   */
  public async init(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const response = await fetch('/wasm/voxelCore.wasm');
        if (!response.ok) {
          console.warn('[VoxelWasm] Could not fetch voxelCore.wasm, falling back to TypeScript engine');
          return false;
        }

        const bytes = await response.arrayBuffer();
        this.binarySize = bytes.byteLength;

        // Custom memory buffer with initial 8 pages (512 KB)
        const wasmModule = await WebAssembly.instantiate(bytes, {
          env: {
            abort: (_msg: number, _file: number, line: number, column: number) => {
              console.error(`[VoxelWasm] Abort at line ${line}:${column}`);
            },
          },
        });

        this.instance = wasmModule.instance.exports as unknown as WasmVoxelExports;
        this.memory = this.instance.memory;
        this.isLoaded = true;
        return true;
      } catch (err) {
        console.warn('[VoxelWasm] WebAssembly initialization error, using TypeScript engine fallback:', err);
        return false;
      }
    })();

    return this.initPromise;
  }

  public isReady(): boolean {
    return this.isLoaded && this.instance !== null;
  }

  public setSkirtDepth(depthFactor: number): void {
    if (this.instance && this.instance.wasmSetSkirtDepth) {
      this.instance.wasmSetSkirtDepth(depthFactor);
    }
  }

  public getTelemetry(): VoxelWasmTelemetry {
    return {
      isWasmActive: this.isLoaded,
      binarySizeBytes: this.binarySize,
      linearMemoryKb: this.memory ? Math.round(this.memory.buffer.byteLength / 1024) : 0,
      lastMeshExtractionTimeUs: Math.round(this.lastMeshExtractionUs),
      lastBrushStampTimeUs: Math.round(this.lastBrushStampUs),
      lastTerrainGenTimeUs: Math.round(this.lastTerrainGenUs),
      lastRaymarchTimeUs: Math.round(this.lastRaymarchUs),
      lastPhysicsTimeUs: Math.round(this.lastPhysicsUs),
      activePhysicsParticles: this.instance ? this.instance.getActiveParticleCount() : 0,
      totalSkirtTriangles: this.totalSkirtTriangles,
      totalWasmInvocations: this.totalInvocations,
    };
  }

  /**
   * Execute CSG Brush Stamp in WebAssembly
   */
  public applyBrush(
    chunk: VoxelChunkData,
    brush: CSGBrushEvent,
    chunkCoord: ChunkCoord3D
  ): boolean {
    if (!this.isReady() || !this.instance || !this.memory) {
      // Fallback to TypeScript engine
      applyBrushToChunk(chunk, brush);
      return false;
    }

    const t0 = performance.now();
    const inst = this.instance;
    const chunkPtr = inst.getChunkBufferPtr();
    const memoryBuffer = this.memory.buffer;

    // Zero-copy view into Wasm linear memory
    const wasmChunkView = new Int8Array(memoryBuffer, chunkPtr, 5832);
    // Copy current chunk SDF data into Wasm buffer
    wasmChunkView.set(chunk.densities);

    // Map shape enum to integer
    let shapeInt = 0;
    if (brush.type === 'box') shapeInt = 1;
    else if (brush.type === 'cylinder') shapeInt = 2;
    else if (brush.type === 'capsule') shapeInt = 3;

    // Map operation to integer
    let opInt = 0;
    if (brush.operation === 'add') opInt = 1;
    else if (brush.operation === 'smooth') opInt = 2;

    const modifiedCount = inst.wasmApplyBrush(
      shapeInt,
      opInt,
      brush.position[0],
      brush.position[1],
      brush.position[2],
      brush.radius,
      brush.height ?? 3.0,
      chunkCoord.x * 4.0, // 16 cells * 0.25m = 4.0m chunk extent
      chunkCoord.y * 4.0,
      chunkCoord.z * 4.0
    );

    // Copy modified SDF back from Wasm buffer to chunk
    chunk.densities.set(wasmChunkView);
    chunk.isDirty = true;

    this.lastBrushStampUs = (performance.now() - t0) * 1000;
    this.totalInvocations++;
    return modifiedCount > 0;
  }

  /**
   * Extract Surface Nets VoxelMesh in WebAssembly
   */
  public extractMesh(
    chunk: VoxelChunkData,
    options?: { lod?: number; quantizeNormals?: boolean; generateSkirts?: boolean; skirtDepthVoxels?: number }
  ): VoxelMesh {
    if (!this.isReady() || !this.instance || !this.memory) {
      // Fallback to TypeScript implementation
      return this.fallbackExtractor.extractMesh(chunk, options);
    }

    const t0 = performance.now();
    const inst = this.instance;
    const chunkPtr = inst.getChunkBufferPtr();
    const memoryBuffer = this.memory.buffer;

    // Set custom skirt depth factor if provided
    if (options?.skirtDepthVoxels !== undefined && inst.wasmSetSkirtDepth) {
      inst.wasmSetSkirtDepth(options.skirtDepthVoxels);
    }

    // Copy chunk density into Wasm linear memory
    const wasmChunkView = new Int8Array(memoryBuffer, chunkPtr, 5832);
    wasmChunkView.set(chunk.densities);

    // Run extraction in WebAssembly with LOD support
    const quantize = options?.quantizeNormals !== false ? 1 : 0;
    const skirts = options?.generateSkirts !== false ? 1 : 0;
    const lod = options?.lod ?? chunk.lod ?? 0;
    const triCount = inst.wasmExtractSurfaceNetsLOD(lod, quantize, skirts);

    const vCount = inst.getExtractedVertexCount();
    const iCount = inst.getExtractedIndexCount();
    const skirtTriCount = inst.getExtractedSkirtTriangleCount ? inst.getExtractedSkirtTriangleCount() : 0;
    const skirtVertCount = inst.getExtractedSkirtVertexCount ? inst.getExtractedSkirtVertexCount() : 0;
    this.totalSkirtTriangles += skirtTriCount;

    if (vCount === 0 || iCount === 0) {
      this.lastMeshExtractionUs = (performance.now() - t0) * 1000;
      this.totalInvocations++;
      return {
        positions: new Float32Array(0),
        normals: new Float32Array(0),
        uvs: new Float32Array(0),
        materialIds: new Float32Array(0),
        indices: new Uint32Array(0),
        vertexCount: 0,
        triangleCount: 0,
        skirtTriangleCount: 0,
        skirtVertexCount: 0,
        bounds: { min: [0, 0, 0], max: [0, 0, 0] },
      };
    }

    // Direct slice from Wasm linear memory buffers
    const vPtr = inst.getVertexBufferPtr();
    const nPtr = inst.getNormalBufferPtr();
    const iPtr = inst.getIndexBufferPtr();

    const positions = new Float32Array(this.memory.buffer, vPtr, vCount * 3).slice();
    const normals = new Float32Array(this.memory.buffer, nPtr, vCount * 3).slice();
    const indices = new Uint32Array(this.memory.buffer, iPtr, iCount).slice();

    const uvs = new Float32Array(vCount * 2);
    const materialIds = new Float32Array(vCount);
    for (let i = 0; i < vCount; i++) {
      uvs[i * 2] = positions[i * 3] * 0.5;
      uvs[i * 2 + 1] = positions[i * 3 + 2] * 0.5;
      materialIds[i] = 1.0;
    }

    this.lastMeshExtractionUs = (performance.now() - t0) * 1000;
    this.totalInvocations++;

    return {
      positions,
      normals,
      uvs,
      materialIds,
      indices,
      vertexCount: vCount,
      triangleCount: triCount,
      skirtTriangleCount: skirtTriCount,
      skirtVertexCount: skirtVertCount,
      bounds: {
        min: [chunk.cx * 4, chunk.cy * 4, chunk.cz * 4],
        max: [(chunk.cx + 1) * 4, (chunk.cy + 1) * 4, (chunk.cz + 1) * 4],
      },
    };
  }

  /**
   * Box-filter downsamples chunk Hermite SDF in WebAssembly by factor (2 or 4)
   */
  public downsampleChunkSDF(chunk: VoxelChunkData, factor: number = 2): boolean {
    if (!this.isReady() || !this.instance || !this.memory) {
      return false;
    }

    const t0 = performance.now();
    const inst = this.instance;
    const chunkPtr = inst.getChunkBufferPtr();
    const wasmChunkView = new Int8Array(this.memory.buffer, chunkPtr, 5832);
    wasmChunkView.set(chunk.densities);

    const count = inst.wasmDownsampleSDF(factor);
    chunk.densities.set(wasmChunkView);
    chunk.isDirty = true;

    this.totalInvocations++;
    return count > 0;
  }

  /**
   * Generates procedural terrain & 3D cave tunnels for a chunk in WebAssembly
   */
  public generateProceduralTerrain(chunk: VoxelChunkData): boolean {
    if (!this.isReady() || !this.instance || !this.memory) {
      return false;
    }

    const t0 = performance.now();
    const inst = this.instance;
    const solidCount = inst.wasmGenerateProceduralTerrain(chunk.cx, chunk.cy, chunk.cz);

    const chunkPtr = inst.getChunkBufferPtr();
    const matPtr = inst.getMaterialBufferPtr();

    // Copy generated density and materials out of Wasm linear memory
    const wasmChunkView = new Int8Array(this.memory.buffer, chunkPtr, 5832);
    const wasmMatView = new Uint8Array(this.memory.buffer, matPtr, 5832);

    chunk.densities.set(wasmChunkView);
    chunk.materials.set(wasmMatView);
    chunk.isDirty = true;

    this.lastTerrainGenUs = (performance.now() - t0) * 1000;
    this.totalInvocations++;
    return solidCount > 0;
  }

  /**
   * Evaluates continuous Trilinear Hermite SDF in WebAssembly
   */
  public queryTrilinearSDF(chunk: VoxelChunkData, lx: number, ly: number, lz: number): number {
    if (!this.isReady() || !this.instance || !this.memory) {
      return 2.0;
    }

    const inst = this.instance;
    const chunkPtr = inst.getChunkBufferPtr();
    const wasmChunkView = new Int8Array(this.memory.buffer, chunkPtr, 5832);
    wasmChunkView.set(chunk.densities);

    return inst.wasmQueryTrilinearSDF(lx, ly, lz);
  }

  /**
   * Raymarch through chunk in WebAssembly using sphere tracing
   */
  public raymarchChunk(
    chunk: VoxelChunkData,
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDist: number
  ): { hit: boolean; point: [number, number, number]; normal: [number, number, number]; distance: number } | null {
    if (!this.isReady() || !this.instance || !this.memory) {
      return null;
    }

    const t0 = performance.now();
    const inst = this.instance;
    const chunkPtr = inst.getChunkBufferPtr();
    const wasmChunkView = new Int8Array(this.memory.buffer, chunkPtr, 5832);
    wasmChunkView.set(chunk.densities);

    const hitDist = inst.wasmRaymarchChunk(originX, originY, originZ, dirX, dirY, dirZ, maxDist);

    this.lastRaymarchUs = (performance.now() - t0) * 1000;
    this.totalInvocations++;

    if (hitDist >= 0.0) {
      const rayPtr = inst.getRayResultPtr();
      const floats = new Float32Array(this.memory.buffer, rayPtr, 6);
      return {
        hit: true,
        point: [floats[0], floats[1], floats[2]],
        normal: [floats[3], floats[4], floats[5]],
        distance: hitDist,
      };
    }

    return null;
  }

  /**
   * Spawns a single physics particle directly in WebAssembly
   */
  public spawnParticle(
    position: [number, number, number],
    velocity: [number, number, number],
    color: [number, number, number],
    maxLife: number = 1.0,
    size: number = 0.15
  ): number {
    if (!this.isReady() || !this.instance) return 0;
    return this.instance.wasmSpawnParticle(
      position[0], position[1], position[2],
      velocity[0], velocity[1], velocity[2],
      color[0], color[1], color[2],
      maxLife, size
    );
  }

  /**
   * Spawns a burst of radial pre-fractured debris pieces in WebAssembly
   */
  public spawnDebrisBurst(
    origin: [number, number, number],
    count: number,
    color: [number, number, number],
    baseSpeed: number = 4.0
  ): number {
    if (!this.isReady() || !this.instance) return 0;
    return this.instance.wasmSpawnDebrisBurst(
      origin[0], origin[1], origin[2],
      count,
      color[0], color[1], color[2],
      baseSpeed
    );
  }

  /**
   * Clears all particles in WebAssembly
   */
  public clearParticles(): void {
    if (this.instance) {
      this.instance.wasmClearParticles();
    }
  }

  /**
   * Batch updates all particles and rigid debris pieces in WebAssembly.
   * Performs terrain Hermite SDF collision bounce and O(1) swap-back compaction.
   * Returns positions and colors packed for direct Three.js BufferAttribute updates.
   */
  public updatePhysicsParticles(
    dt: number,
    gravity: number = 9.8,
    bounceTerrain: boolean = true
  ): { count: number; positions: Float32Array; colors: Float32Array } {
    if (!this.isReady() || !this.instance || !this.memory) {
      return { count: 0, positions: new Float32Array(0), colors: new Float32Array(0) };
    }

    const t0 = performance.now();
    const inst = this.instance;
    const activeCount = inst.wasmUpdateParticles(dt, gravity, bounceTerrain ? 1 : 0);

    this.lastPhysicsUs = (performance.now() - t0) * 1000;
    this.totalInvocations++;

    if (activeCount === 0) {
      return { count: 0, positions: new Float32Array(0), colors: new Float32Array(0) };
    }

    // Direct read from Wasm linear memory (48 bytes per particle = 12 floats)
    const pPtr = inst.getParticleBufferPtr();
    const floatView = new Float32Array(this.memory.buffer, pPtr, activeCount * 12);

    const positions = new Float32Array(activeCount * 3);
    const colors = new Float32Array(activeCount * 3);

    for (let i = 0; i < activeCount; i++) {
      const base = i * 12;
      positions[i * 3] = floatView[base];
      positions[i * 3 + 1] = floatView[base + 1];
      positions[i * 3 + 2] = floatView[base + 2];

      const life = floatView[base + 9];
      const alpha = Math.max(0.0, 1.0 - life);

      colors[i * 3] = floatView[base + 6] * alpha;
      colors[i * 3 + 1] = floatView[base + 7] * alpha;
      colors[i * 3 + 2] = floatView[base + 8] * alpha;
    }

    return { count: activeCount, positions, colors };
  }

  /**
   * Resolves kinematic swept capsule collision and sliding in WebAssembly
   */
  public resolveCapsuleStep(
    chunk: VoxelChunkData,
    pos: [number, number, number],
    vel: [number, number, number],
    radius: number,
    height: number,
    dt: number,
    gravity: number = 18.0
  ): CapsuleStepResult {
    if (!this.instance || !this.isLoaded) {
      return {
        pos: [pos[0] + vel[0] * dt, pos[1] + (vel[1] - gravity * dt) * dt, pos[2] + vel[2] * dt],
        vel: [vel[0], vel[1] - gravity * dt, vel[2]],
        groundNormal: [0, 1, 0],
        groundSdf: 1.0,
        isGrounded: false,
        collisionCount: 0
      };
    }

    const chunkPtr = this.instance.getChunkBufferPtr();
    if (this.memory) {
      const wasmChunkView = new Int8Array(this.memory.buffer, chunkPtr, 5832);
      wasmChunkView.set(chunk.densities);
    }

    const chunkOriginX = chunk.cx * 16 * 0.25;
    const chunkOriginY = chunk.cy * 16 * 0.25;
    const chunkOriginZ = chunk.cz * 16 * 0.25;

    this.instance.wasmResolveCapsuleStep(
      pos[0], pos[1], pos[2],
      vel[0], vel[1], vel[2],
      radius, height,
      dt, gravity,
      chunkOriginX, chunkOriginY, chunkOriginZ
    );

    const isGrounded = this.instance.wasmGetCapsuleGrounded() === 1;

    return {
      pos: [
        this.instance.wasmGetCapsulePosX(),
        this.instance.wasmGetCapsulePosY(),
        this.instance.wasmGetCapsulePosZ()
      ],
      vel: [
        this.instance.wasmGetCapsuleVelX(),
        this.instance.wasmGetCapsuleVelY(),
        this.instance.wasmGetCapsuleVelZ()
      ],
      groundNormal: [
        this.instance.wasmGetCapsuleGroundNormalX(),
        this.instance.wasmGetCapsuleGroundNormalY(),
        this.instance.wasmGetCapsuleGroundNormalZ()
      ],
      groundSdf: this.instance.wasmGetCapsuleGroundSDF(),
      isGrounded,
      collisionCount: this.instance.wasmGetCapsuleCollisionCount()
    };
  }

  /**
   * Solves Feature-Preserving QEF in WebAssembly
   */
  public solveQEF(
    planes: Array<{ point: [number, number, number]; normal: [number, number, number] }>,
    minBound: [number, number, number],
    maxBound: [number, number, number]
  ): [number, number, number] {
    if (!this.instance || !this.isLoaded || planes.length === 0) {
      return [
        (minBound[0] + maxBound[0]) * 0.5,
        (minBound[1] + maxBound[1]) * 0.5,
        (minBound[2] + maxBound[2]) * 0.5
      ];
    }

    this.instance.wasmQEFReset();
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      this.instance.wasmQEFAddPlane(
        p.point[0], p.point[1], p.point[2],
        p.normal[0], p.normal[1], p.normal[2]
      );
    }

    this.instance.wasmQEFSolve(
      minBound[0], minBound[1], minBound[2],
      maxBound[0], maxBound[1], maxBound[2]
    );

    return [
      this.instance.wasmGetQEFResultX(),
      this.instance.wasmGetQEFResultY(),
      this.instance.wasmGetQEFResultZ()
    ];
  }

  // --- System 3: Prop Shielding ---
  public clearShields(): void {
    if (this.instance) this.instance.wasmClearShields();
  }

  public registerShield(posX: number, posY: number, posZ: number, radius: number, durability: number): number {
    if (!this.instance) return 0;
    return this.instance.wasmAddShield(posX, posY, posZ, radius, durability);
  }

  public getShieldBlockedCount(): number {
    return this.instance ? this.instance.wasmGetShieldBlockedCount() : 0;
  }

  // --- System 4: Metroidvania 2D Cellular Automata & A* ---
  public generateCellularCave2D(
    width: number,
    height: number,
    fillPercent: number = 0.45,
    birthLimit: number = 4,
    deathLimit: number = 4,
    iterations: number = 5,
    seed: number = 42
  ): Uint8Array {
    if (!this.instance || !this.memory) {
      return new Uint8Array(width * height);
    }
    this.instance.wasmInitGrid2D(width, height, fillPercent, seed);
    this.instance.wasmRunCellularAutomata(width, height, birthLimit, deathLimit, iterations);

    const ptr = this.instance.getGrid2DBufferPtr();
    const result = new Uint8Array(width * height);
    result.set(new Uint8Array(this.memory.buffer, ptr, width * height));
    return result;
  }

  public checkPathAStar(
    width: number, height: number,
    startX: number, startY: number,
    targetX: number, targetY: number
  ): number {
    if (!this.instance) return -1;
    return this.instance.wasmCheckConnectivityAStar(width, height, startX, startY, targetX, targetY);
  }

  // --- System 5: Inverse Kinematics ---
  public solveTwoBoneIK(
    rootX: number, rootY: number,
    targetX: number, targetY: number,
    length1: number, length2: number,
    flipBend: boolean = false
  ): { angle1Deg: number; angle2Deg: number; reached: boolean } {
    if (!this.instance) {
      return { angle1Deg: 0, angle2Deg: 0, reached: false };
    }
    const reached = this.instance.wasmSolveTwoBoneIK(rootX, rootY, targetX, targetY, length1, length2, flipBend ? 1 : 0);
    return {
      angle1Deg: this.instance.wasmGetIKAngle1(),
      angle2Deg: this.instance.wasmGetIKAngle2(),
      reached: reached === 1
    };
  }

  public solveCCDIK(
    bones: Array<{ length: number; angleDeg: number; minAngle: number; maxAngle: number }>,
    targetX: number, targetY: number,
    rootX: number, rootY: number,
    maxIterations: number = 15,
    tolerance: number = 0.5
  ): number[] {
    if (!this.instance) return bones.map(b => b.angleDeg);
    for (let i = 0; i < bones.length; i++) {
      const b = bones[i];
      this.instance.wasmSetIKChainBone(i, b.length, b.angleDeg, b.minAngle, b.maxAngle);
    }
    this.instance.wasmSolveCCDIK(bones.length, targetX, targetY, rootX, rootY, maxIterations, tolerance);
    const angles: number[] = [];
    for (let i = 0; i < bones.length; i++) {
      angles.push(this.instance.wasmGetIKBoneAngle(i));
    }
    return angles;
  }

  // --- System 6: High-Density 2D Particle Engine ---
  public spawn2DParticle(x: number, y: number, vx: number, vy: number, maxLife: number = 1.0, size: number = 4.0): number {
    if (!this.instance) return 0;
    return this.instance.wasmSpawn2DParticle(x, y, vx, vy, maxLife, size);
  }

  public spawn2DBurst(x: number, y: number, count: number = 20, speed: number = 50.0, spread: number = 1.2): number {
    if (!this.instance) return 0;
    return this.instance.wasmSpawn2DBurst(x, y, count, speed, spread);
  }

  public update2DParticles(
    dt: number,
    gravityX: number = 0.0,
    gravityY: number = 180.0,
    drag: number = 0.05,
    floorY: number = 600.0,
    bounce: number = 0.4
  ): { count: number; buffer: Float32Array } {
    if (!this.instance || !this.memory) {
      return { count: 0, buffer: new Float32Array(0) };
    }
    const count = this.instance.wasmUpdate2DParticles(dt, gravityX, gravityY, drag, floorY, bounce);
    const ptr = this.instance.getParticle2DBufferPtr();
    const view = new Float32Array(this.memory.buffer, ptr, count * 8);
    return { count, buffer: view };
  }
}

export const voxelWasmBridge = new VoxelWasmBridge();
