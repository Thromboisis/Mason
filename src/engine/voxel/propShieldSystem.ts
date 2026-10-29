/**
 * Subsystem 3: Micro-Detail Props & Terrain Shielding
 * 
 * Specification:
 * - Rendering: Instanced static polygon meshes rendered via indirect draw simulation.
 *   Completely decoupled from voxel density buffers.
 * - Snapping: Position clamped to 0.25 m grid steps; rotation clamped to 22.5° yaw intervals (16-point compass).
 * - Terrain Shielding: Active props register an exclusion radius (R_shield).
 *   CSG blast carves are masked out under/around the prop unless the blast damage exceeds the prop's durability.
 * - Destruction: Fatal damage despawns the prop into pre-fractured rigid debris;
 *   underlying terrain is only carved if an explosion stamp lands without an active shield.
 */

import { BASE_CELL_SIZE, NORMAL_SNAP_INTERVAL, PropShield } from './voxelTypes';
import { voxelWasmBridge } from './wasmBridge';

export type PropType =
  | 'shield_totem'
  | 'ancient_pillar'
  | 'wooden_scaffold'
  | 'crystal_cluster'
  | 'lantern_post'
  | 'expedition_chest'
  | 'geometric_canopy_tree';

export interface PropDefinition {
  type: PropType;
  name: string;
  shieldRadius: number; // in meters (R_shield)
  maxDurability: number; // HP before fatal destruction
  color: string;
  emissiveColor: string;
  description: string;
  dimensions: [number, number, number]; // width, height, depth
}

export const PROP_CATALOG: Record<PropType, PropDefinition> = {
  shield_totem: {
    type: 'shield_totem',
    name: 'Shield Totem',
    shieldRadius: 3.5,
    maxDurability: 100,
    color: '#06b6d4', // Cyan
    emissiveColor: '#22d3ee',
    description: 'Emits a 3.5m protective forcefield preventing voxel terrain excavation',
    dimensions: [0.8, 2.2, 0.8],
  },
  ancient_pillar: {
    type: 'ancient_pillar',
    name: 'Ancient Rune Pillar',
    shieldRadius: 2.5,
    maxDurability: 150,
    color: '#8b5cf6', // Violet
    emissiveColor: '#a78bfa',
    description: 'Reinforced megalithic stone pillar anchored into bedrock',
    dimensions: [1.0, 3.2, 1.0],
  },
  wooden_scaffold: {
    type: 'wooden_scaffold',
    name: "Miner's Scaffolding",
    shieldRadius: 2.0,
    maxDurability: 40,
    color: '#d97706', // Amber wood
    emissiveColor: '#f59e0b',
    description: 'Timber framing for shaft support. Fragile against high-yield blasts',
    dimensions: [1.8, 2.4, 1.8],
  },
  crystal_cluster: {
    type: 'crystal_cluster',
    name: 'Luminous Crystal Cluster',
    shieldRadius: 1.5,
    maxDurability: 60,
    color: '#10b981', // Emerald
    emissiveColor: '#34d399',
    description: 'Hardened geo-crystals resonating with underground density',
    dimensions: [1.0, 1.4, 1.0],
  },
  lantern_post: {
    type: 'lantern_post',
    name: 'Iron Lantern Post',
    shieldRadius: 1.0,
    maxDurability: 30,
    color: '#eab308', // Warm light
    emissiveColor: '#facc15',
    description: 'Illuminates dark caves with a small structural anchor',
    dimensions: [0.4, 1.8, 0.4],
  },
  expedition_chest: {
    type: 'expedition_chest',
    name: 'Expedition Cache Chest',
    shieldRadius: 1.25,
    maxDurability: 50,
    color: '#f97316', // Orange
    emissiveColor: '#fb923c',
    description: 'Reinforced lockbox storing rare artifacts and mineral samples',
    dimensions: [0.8, 0.6, 0.6],
  },
  geometric_canopy_tree: {
    type: 'geometric_canopy_tree',
    name: 'Geometric Canopy Tree',
    shieldRadius: 2.2,
    maxDurability: 85,
    color: '#15803d', // Forest Green
    emissiveColor: '#22c55e',
    description: '100% solid faceted leaf clusters with 0 opacity masks, sustaining 1.0x Early-Z on Steam Deck',
    dimensions: [2.4, 4.2, 2.4],
  },
};

export interface PropInstance {
  id: string;
  type: PropType;
  position: [number, number, number]; // Snapped to 0.25 m
  yawAngle: number; // Snapped to 22.5° (0, 22.5, 45, ...)
  currentDurability: number;
  maxDurability: number;
  isShieldActive: boolean;
  scale: [number, number, number];
}

export interface FracturedDebrisPiece {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class PropShieldSystem {
  private props: Map<string, PropInstance> = new Map();
  public debrisPieces: FracturedDebrisPiece[] = [];
  private nextDebrisId = 1;

  constructor() {
    this.seedDefaultProps();
  }

  /**
   * Helper: Snap world coordinate to 0.25m grid steps
   */
  public static snapPosition(val: number): number {
    return Math.round(val / BASE_CELL_SIZE) * BASE_CELL_SIZE;
  }

  /**
   * Helper: Snap yaw rotation angle to 22.5° steps
   */
  public static snapYaw(angleDeg: number): number {
    const step = NORMAL_SNAP_INTERVAL; // 22.5 degrees
    const snapped = Math.round(angleDeg / step) * step;
    return ((snapped % 360) + 360) % 360;
  }

  /**
   * Seed default starting props in the world
   */
  private seedDefaultProps() {
    this.addProp('shield_totem', [0, 4.25, 0], 0);
    this.addProp('ancient_pillar', [-4, 3.5, 4], 45);
    this.addProp('crystal_cluster', [5, 2.5, -3], 67.5);
    this.addProp('wooden_scaffold', [3.5, 1.25, 5], 90);
  }

  /**
   * Place a new prop with 0.25m position and 22.5° yaw snapping
   */
  public addProp(type: PropType, worldPos: [number, number, number], yawDeg = 0): PropInstance {
    const def = PROP_CATALOG[type];
    const snappedPos: [number, number, number] = [
      PropShieldSystem.snapPosition(worldPos[0]),
      PropShieldSystem.snapPosition(worldPos[1]),
      PropShieldSystem.snapPosition(worldPos[2]),
    ];
    const snappedYaw = PropShieldSystem.snapYaw(yawDeg);

    const instance: PropInstance = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      position: snappedPos,
      yawAngle: snappedYaw,
      currentDurability: def.maxDurability,
      maxDurability: def.maxDurability,
      isShieldActive: true,
      scale: [1, 1, 1],
    };

    this.props.set(instance.id, instance);
    return instance;
  }

  /**
   * Remove a prop by ID
   */
  public removeProp(id: string): boolean {
    return this.props.delete(id);
  }

  /**
   * Get all active PropShield definitions for the CSG brush exclusion calculations
   */
  public getActiveShields(): PropShield[] {
    const shields: PropShield[] = [];
    for (const prop of this.props.values()) {
      if (prop.isShieldActive) {
        const def = PROP_CATALOG[prop.type];
        shields.push({
          id: prop.id,
          position: prop.position,
          radius: def.shieldRadius,
          durability: prop.currentDurability,
          active: true,
        });
      }
    }
    return shields;
  }

  /**
   * Evaluates blast damage against props within the blast radius.
   * If damage exceeds durability, the prop is fatally shattered into debris pieces.
   * Returns list of destroyed prop IDs.
   */
  public applyBlastDamage(
    blastOrigin: [number, number, number],
    blastRadius: number,
    damage: number
  ): string[] {
    const destroyedIds: string[] = [];

    for (const [id, prop] of this.props.entries()) {
      const dist = Math.hypot(
        prop.position[0] - blastOrigin[0],
        prop.position[1] - blastOrigin[1],
        prop.position[2] - blastOrigin[2]
      );

      // If prop is touched by the blast sphere
      if (dist <= blastRadius + 0.5) {
        prop.currentDurability -= damage;

        if (prop.currentDurability <= 0) {
          // Fatal destruction: spawn pre-fractured debris particles
          this.spawnDebris(prop);
          destroyedIds.push(id);
          this.props.delete(id);
        }
      }
    }

    return destroyedIds;
  }

  /**
   * Spawns pre-fractured debris pieces for a destroyed prop
   */
  private spawnDebris(prop: PropInstance) {
    const def = PROP_CATALOG[prop.type];
    const pieceCount = 18;

    if (voxelWasmBridge.isReady()) {
      // Parse hex color into RGB 0..1
      const c = parseInt(def.color.replace('#', ''), 16);
      const r = ((c >> 16) & 255) / 255.0;
      const g = ((c >> 8) & 255) / 255.0;
      const b = (c & 255) / 255.0;

      voxelWasmBridge.spawnDebrisBurst(
        prop.position,
        pieceCount,
        [r, g, b],
        4.5
      );
    }

    for (let i = 0; i < pieceCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      const vx = Math.cos(angle) * speed;
      const vy = 1.5 + Math.random() * 3.5;
      const vz = Math.sin(angle) * speed;

      this.debrisPieces.push({
        id: this.nextDebrisId++,
        position: [
          prop.position[0] + (Math.random() - 0.5) * 0.4,
          prop.position[1] + Math.random() * def.dimensions[1] * 0.5,
          prop.position[2] + (Math.random() - 0.5) * 0.4,
        ],
        velocity: [vx, vy, vz],
        color: def.color,
        size: 0.12 + Math.random() * 0.18,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
      });
    }

    if (this.debrisPieces.length > 200) {
      this.debrisPieces.splice(0, this.debrisPieces.length - 200);
    }
  }

  /**
   * Update physics for debris pieces
   */
  public updateDebris(deltaTime: number) {
    for (let i = this.debrisPieces.length - 1; i >= 0; i--) {
      const piece = this.debrisPieces[i];
      piece.life += deltaTime / piece.maxLife;
      if (piece.life >= 1.0) {
        this.debrisPieces.splice(i, 1);
        continue;
      }
      piece.velocity[1] -= 9.8 * deltaTime;
      piece.position[0] += piece.velocity[0] * deltaTime;
      piece.position[1] += piece.velocity[1] * deltaTime;
      piece.position[2] += piece.velocity[2] * deltaTime;

      // Ground bounce clamp
      if (piece.position[1] < 0) {
        piece.position[1] = 0;
        piece.velocity[1] = -piece.velocity[1] * 0.3;
        piece.velocity[0] *= 0.6;
        piece.velocity[2] *= 0.6;
      }
    }
  }

  public getAllProps(): PropInstance[] {
    return Array.from(this.props.values());
  }

  public getProp(id: string): PropInstance | undefined {
    return this.props.get(id);
  }

  public clear() {
    this.props.clear();
    this.debrisPieces = [];
  }
}
