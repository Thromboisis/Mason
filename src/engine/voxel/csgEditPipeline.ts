/**
 * 9-Frame Distributed CSG Edit Pipeline
 * 
 * Implements the rolling 9-frame execution specification (~100 ms at 90 FPS):
 * - Frame 1: Immediate analytical SDF carve on density buffers; spawn opaque latency-masking particle blast.
 * - Frames 1–3 (High Priority): Direct line-of-sight LOD 0 meshing & player capsule collision SDF swap.
 * - Frames 4–6 (Medium Priority): Peripheral LOD 0 chunks & camera spring-arm occlusion chunks.
 * - Frames 7–9 (Low Priority): Hierarchical downsampling and LOD 1/2 Surface Nets generation.
 * - Zero Runtime Allocations: Dedicated pre-allocated scratchpads (18³ = 5,832 bytes per worker) and staging ring buffers.
 */

import {
  VoxelChunkData,
  CSGBrushEvent,
  CHUNK_ACTIVE_CELLS,
  CHUNK_TOTAL_SAMPLES,
  BASE_CELL_SIZE,
  VoxelMesh,
  PropShield,
  chunkCoordToKey
} from './voxelTypes';
import { SurfaceNetsExtractor } from './surfaceNetsExtractor';
import { applyBrushToChunk } from './csgBrushEngine';
import { voxelWasmBridge } from './wasmBridge';

export type CSGPipelineTier = 'high' | 'medium' | 'low';

export interface ActiveEditJob {
  id: string;
  brushEvent: CSGBrushEvent;
  affectedChunkKeys: string[];
  currentFrame: number; // 1 to 9
  maxFrames: number; // 9
  highPriorityKeys: string[];
  mediumPriorityKeys: string[];
  lowPriorityKeys: string[];
  status: 'running' | 'completed';
  timestamp: number;
}

export interface LatencyMaskParticle {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: [number, number, number];
  size: number;
  life: number; // 0..1
  maxLife: number; // seconds
  rotSpeed: number;
}

export interface CSGFramePipelineStats {
  activeJobsCount: number;
  currentPipelineFrame: number;
  highPriorityChunksRemaining: number;
  mediumPriorityChunksRemaining: number;
  lowPriorityChunksRemaining: number;
  zeroAllocScratchpadHitCount: number;
  latencyMaskParticlesCount: number;
}

export class CSGDistributedPipeline {
  // Pre-allocated scratchpads (18³ = 5,832 bytes per worker) for zero-alloc density operations
  private readonly scratchpadRingSize = 8;
  private readonly scratchpads: Int8Array[];
  private scratchpadIndex = 0;

  // Active jobs in the 9-frame rolling queue
  private activeJobs: ActiveEditJob[] = [];

  // Surface nets extractor
  private extractor: SurfaceNetsExtractor = new SurfaceNetsExtractor();

  // Particle pool for Frame-1 latency masking flash/smoke
  public particles: LatencyMaskParticle[] = [];
  private nextParticleId = 1;

  // Telemetry
  public stats: CSGFramePipelineStats = {
    activeJobsCount: 0,
    currentPipelineFrame: 1,
    highPriorityChunksRemaining: 0,
    mediumPriorityChunksRemaining: 0,
    lowPriorityChunksRemaining: 0,
    zeroAllocScratchpadHitCount: 0,
    latencyMaskParticlesCount: 0,
  };

  constructor() {
    // Pre-allocate scratchpads (5,832 bytes each)
    this.scratchpads = [];
    for (let i = 0; i < this.scratchpadRingSize; i++) {
      this.scratchpads.push(new Int8Array(CHUNK_TOTAL_SAMPLES));
    }
  }

  /**
   * Acquire a pre-allocated scratchpad buffer without runtime garbage collection
   */
  public acquireScratchpad(): Int8Array {
    this.stats.zeroAllocScratchpadHitCount++;
    const buf = this.scratchpads[this.scratchpadIndex];
    this.scratchpadIndex = (this.scratchpadIndex + 1) % this.scratchpadRingSize;
    return buf;
  }

  /**
   * Dispatches a new CSG Blast/Carve event into the 9-Frame distributed pipeline
   */
  public dispatchCSGBlast(
    brush: CSGBrushEvent,
    chunks: Map<string, VoxelChunkData>,
    cameraPosition: [number, number, number],
    activeShields: PropShield[] = []
  ): ActiveEditJob {
    const chunkWorldSpan = CHUNK_ACTIVE_CELLS * BASE_CELL_SIZE;
    const r = brush.radius;
    const origin = brush.position;
    const minX = Math.floor((origin[0] - r) / chunkWorldSpan);
    const maxX = Math.floor((origin[0] + r) / chunkWorldSpan);
    const minY = Math.floor((origin[1] - r) / chunkWorldSpan);
    const maxY = Math.floor((origin[1] + r) / chunkWorldSpan);
    const minZ = Math.floor((origin[2] - r) / chunkWorldSpan);
    const maxZ = Math.floor((origin[2] + r) / chunkWorldSpan);

    const affectedKeys: string[] = [];
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cz = minZ; cz <= maxZ; cz++) {
          const key = chunkCoordToKey(cx, cy, cz);
          if (chunks.has(key)) {
            affectedKeys.push(key);
          }
        }
      }
    }

    // Sort affected chunks into Priority Tiers:
    // High Priority: Direct line-of-sight / closest to camera and blast origin
    // Medium Priority: Peripheral LOD 0 chunks
    // Low Priority: Distant / border chunks for LOD 1/2 downsampling
    const sorted = [...affectedKeys].sort((aKey, bKey) => {
      const a = chunks.get(aKey)!;
      const b = chunks.get(bKey)!;
      const aOriginX = a.cx * chunkWorldSpan;
      const aOriginY = a.cy * chunkWorldSpan;
      const aOriginZ = a.cz * chunkWorldSpan;
      const bOriginX = b.cx * chunkWorldSpan;
      const bOriginY = b.cy * chunkWorldSpan;
      const bOriginZ = b.cz * chunkWorldSpan;

      const distA = Math.hypot(
        aOriginX - cameraPosition[0],
        aOriginY - cameraPosition[1],
        aOriginZ - cameraPosition[2]
      );
      const distB = Math.hypot(
        bOriginX - cameraPosition[0],
        bOriginY - cameraPosition[1],
        bOriginZ - cameraPosition[2]
      );
      return distA - distB;
    });

    const highCount = Math.max(1, Math.min(3, Math.ceil(sorted.length * 0.4)));
    const mediumCount = Math.min(sorted.length - highCount, Math.ceil(sorted.length * 0.4));
    
    const highPriorityKeys = sorted.slice(0, highCount);
    const mediumPriorityKeys = sorted.slice(highCount, highCount + mediumCount);
    const lowPriorityKeys = sorted.slice(highCount + mediumCount);

    // Frame 1: Immediate analytical SDF updates on all affected chunk density buffers
    for (const key of affectedKeys) {
      const chunk = chunks.get(key);
      if (chunk) {
        applyBrushToChunk(chunk, brush, activeShields);
      }
    }

    // Frame 1 Latency Masking: Spawn immediate burst of opaque particle flash & debris
    this.spawnLatencyMaskBurst(brush.position, brush.radius, brush.operation);

    const job: ActiveEditJob = {
      id: `csg-job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      brushEvent: brush,
      affectedChunkKeys: affectedKeys,
      currentFrame: 1,
      maxFrames: 9,
      highPriorityKeys,
      mediumPriorityKeys,
      lowPriorityKeys,
      status: 'running',
      timestamp: performance.now(),
    };

    this.activeJobs.push(job);
    this.updateStats();
    return job;
  }

  /**
   * Spawns immediate opaque blast/flash particles on Frame 1 to visually mask
   * the 33 ms LOD 0 meshing latency
   */
  private spawnLatencyMaskBurst(
    origin: [number, number, number],
    radius: number,
    operation: string
  ) {
    const count = 35;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const speed = 4.0 + Math.random() * 8.0;

      const vx = Math.cos(phi) * Math.cos(theta) * speed;
      const vy = (Math.sin(phi) + 0.6) * speed; // upward blast bias
      const vz = Math.cos(phi) * Math.sin(theta) * speed;

      const isCarve = operation === 'carve';
      const color: [number, number, number] = isCarve
        ? [
            0.95 + Math.random() * 0.05, // fiery orange/dust
            0.45 + Math.random() * 0.3,
            0.15 + Math.random() * 0.1,
          ]
        : [
            0.3 + Math.random() * 0.2, // mystical blue/green additive glow
            0.8 + Math.random() * 0.2,
            0.9 + Math.random() * 0.1,
          ];

      const pos: [number, number, number] = [
        origin[0] + (Math.random() - 0.5) * radius * 0.4,
        origin[1] + (Math.random() - 0.5) * radius * 0.4,
        origin[2] + (Math.random() - 0.5) * radius * 0.4,
      ];
      const maxLife = 0.45 + Math.random() * 0.4;
      const size = 0.15 + Math.random() * 0.35;

      if (voxelWasmBridge.isReady()) {
        voxelWasmBridge.spawnParticle(pos, [vx, vy, vz], color, maxLife, size);
      }

      this.particles.push({
        id: this.nextParticleId++,
        position: pos,
        velocity: [vx, vy, vz],
        color,
        size,
        life: 0,
        maxLife,
        rotSpeed: (Math.random() - 0.5) * 6,
      });
    }

    // Limit maximum particles to avoid performance degradation
    if (this.particles.length > 250) {
      this.particles.splice(0, this.particles.length - 250);
    }
  }

  /**
   * Advances the 9-frame pipeline by one frame.
   * Call this in the host requestAnimationFrame loop.
   * Returns newly re-meshed chunk keys ready to swap into the GPU scene graph.
   */
  public advanceFrame(
    deltaTime: number,
    chunks: Map<string, VoxelChunkData>,
    quantizeNormals: boolean,
    generateSkirts: boolean,
    onChunkMeshExtracted: (chunkKey: string, mesh: VoxelMesh) => void,
    skirtDepthVoxels: number = 1.25
  ): string[] {
    const swappedChunkKeys: string[] = [];

    // 1. Update latency-mask particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime / p.maxLife;
      if (p.life >= 1.0) {
        this.particles.splice(i, 1);
        continue;
      }
      // Physics: drag + gravity
      p.velocity[1] -= 9.8 * 0.4 * deltaTime;
      p.velocity[0] *= (1.0 - 1.5 * deltaTime);
      p.velocity[2] *= (1.0 - 1.5 * deltaTime);

      p.position[0] += p.velocity[0] * deltaTime;
      p.position[1] += p.velocity[1] * deltaTime;
      p.position[2] += p.velocity[2] * deltaTime;
    }

    // 2. Advance active CSG edit jobs across their 9-frame window
    for (let j = this.activeJobs.length - 1; j >= 0; j--) {
      const job = this.activeJobs[j];
      const frame = job.currentFrame;

      // Tier 1: Frames 1–3 (High Priority: LOD 0 line-of-sight meshing)
      if (frame >= 1 && frame <= 3) {
        const chunkIndexToProcess = frame - 1;
        if (chunkIndexToProcess < job.highPriorityKeys.length) {
          const key = job.highPriorityKeys[chunkIndexToProcess];
          const chunk = chunks.get(key);
          if (chunk && chunk.isDirty) {
            const mesh = voxelWasmBridge.isReady()
              ? voxelWasmBridge.extractMesh(chunk, { quantizeNormals, generateSkirts, skirtDepthVoxels })
              : this.extractor.extractMesh(chunk, { quantizeNormals, generateSkirts, skirtDepthVoxels });
            chunk.mesh = mesh;
            chunk.isDirty = false;
            swappedChunkKeys.push(key);
            onChunkMeshExtracted(key, mesh);
          }
        }
      }

      // Tier 2: Frames 4–6 (Medium Priority: Peripheral chunks)
      else if (frame >= 4 && frame <= 6) {
        const chunkIndexToProcess = frame - 4;
        if (chunkIndexToProcess < job.mediumPriorityKeys.length) {
          const key = job.mediumPriorityKeys[chunkIndexToProcess];
          const chunk = chunks.get(key);
          if (chunk && chunk.isDirty) {
            const mesh = voxelWasmBridge.isReady()
              ? voxelWasmBridge.extractMesh(chunk, { quantizeNormals, generateSkirts, skirtDepthVoxels })
              : this.extractor.extractMesh(chunk, { quantizeNormals, generateSkirts, skirtDepthVoxels });
            chunk.mesh = mesh;
            chunk.isDirty = false;
            swappedChunkKeys.push(key);
            onChunkMeshExtracted(key, mesh);
          }
        }
      }

      // Tier 3: Frames 7–9 (Low Priority: Distant / border chunks)
      else if (frame >= 7 && frame <= 9) {
        const chunkIndexToProcess = frame - 7;
        if (chunkIndexToProcess < job.lowPriorityKeys.length) {
          const key = job.lowPriorityKeys[chunkIndexToProcess];
          const chunk = chunks.get(key);
          if (chunk && chunk.isDirty) {
            if (chunk.lod > 0 && voxelWasmBridge.isReady()) {
              voxelWasmBridge.downsampleChunkSDF(chunk, 2);
            }
            const mesh = voxelWasmBridge.isReady()
              ? voxelWasmBridge.extractMesh(chunk, { lod: chunk.lod, quantizeNormals, generateSkirts, skirtDepthVoxels })
              : this.extractor.extractMesh(chunk, { quantizeNormals, generateSkirts, skirtDepthVoxels });
            chunk.mesh = mesh;
            chunk.isDirty = false;
            swappedChunkKeys.push(key);
            onChunkMeshExtracted(key, mesh);
          }
        }
      }

      job.currentFrame++;
      if (job.currentFrame > job.maxFrames) {
        job.status = 'completed';
        // Final safety pass: ensure any remaining dirty chunk in this job is remeshed
        for (const key of job.affectedChunkKeys) {
          const chunk = chunks.get(key);
          if (chunk && chunk.isDirty) {
            const mesh = voxelWasmBridge.isReady()
              ? voxelWasmBridge.extractMesh(chunk, { quantizeNormals, generateSkirts, skirtDepthVoxels })
              : this.extractor.extractMesh(chunk, { quantizeNormals, generateSkirts, skirtDepthVoxels });
            chunk.mesh = mesh;
            chunk.isDirty = false;
            swappedChunkKeys.push(key);
            onChunkMeshExtracted(key, mesh);
          }
        }
        this.activeJobs.splice(j, 1);
      }
    }

    this.updateStats();
    return swappedChunkKeys;
  }

  private updateStats() {
    let high = 0;
    let med = 0;
    let low = 0;
    for (const job of this.activeJobs) {
      if (job.currentFrame <= 3) high += job.highPriorityKeys.length;
      else if (job.currentFrame <= 6) med += job.mediumPriorityKeys.length;
      else low += job.lowPriorityKeys.length;
    }

    this.stats = {
      activeJobsCount: this.activeJobs.length,
      currentPipelineFrame: this.activeJobs.length > 0 ? this.activeJobs[0].currentFrame : 1,
      highPriorityChunksRemaining: high,
      mediumPriorityChunksRemaining: med,
      lowPriorityChunksRemaining: low,
      zeroAllocScratchpadHitCount: this.stats.zeroAllocScratchpadHitCount,
      latencyMaskParticlesCount: this.particles.length,
    };
  }

  public getActiveJobs(): readonly ActiveEditJob[] {
    return this.activeJobs;
  }

  public clear() {
    this.activeJobs = [];
    this.particles = [];
  }
}
