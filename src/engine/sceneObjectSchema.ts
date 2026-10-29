/**
 * Mason 3-Tier Architecture Schema
 * 
 * 1. Main Scene: Persistent root orchestrator (Splash, Menus, Settings, Save/Load, Persistent HUD, 3D World Space & Sub-scene loading)
 * 2. Sub-Scenes: Containers for isolated gameplay spaces (1 sub-scene loaded at a time, placed objects in 3D space)
 * 3. Objects: Entity-Component-Graph studio (Empty 3D Object + Attachable Components + Visual Logic Graph)
 */

import {
  SplashScreenConfig,
  StartMenuConfig,
  GameSettingsConfig,
  GameGenreControllerType
} from './frayUniverseSchema';
import {
  GuiScreenDefinition,
  GuiThemeConfig,
  DefaultGuiId,
  createDefaultGuiScreens,
  PRESET_GUI_THEMES
} from './mainSceneGuiSchema';
export * from './mainSceneGuiSchema';

export interface SaveLoadSystemConfig {
  maxSlots: number;
  activeSlotId: string;
  autoSaveIntervalMinutes: number;
  slots: Array<{
    id: string;
    label: string;
    timestamp: string;
    currentMapName: string;
    playtimeSeconds: number;
    playerLevel: number;
    valorPoints: number;
    actionPoints: number;
    equippedInsigniaId: string;
  }>;
}

export interface PersistentHUDConfig {
  showHealth: boolean;
  showManaOrAP: boolean;
  showValorMeter: boolean;
  showFociRadial: boolean;
  showMinimap: boolean;
  showActionFeed: boolean;
  hudScale: number;
  accentColor: string;
}

export interface FrayCombatantLoadout {
  assignedFocusSlots: {
    primaryStance: string;
    offhandChannel: string;
    aegisWard: string;
  };
  insigniaId: string;
  currentValorPoints: number;
  overdriveActive: boolean;
  currentActionPoints: number;
  maxActionPoints: number;
}

export const createDefaultCombatantLoadout = (): FrayCombatantLoadout => ({
  assignedFocusSlots: {
    primaryStance: 'foci_cleaving_strike',
    offhandChannel: 'foci_galvanic_burst',
    aegisWard: 'foci_bulwark_parry'
  },
  insigniaId: 'insignia_ashen_warden',
  currentValorPoints: 50,
  overdriveActive: false,
  currentActionPoints: 100,
  maxActionPoints: 100
});

// ==========================================
// 1. MAIN SCENE CONFIGURATION
// ==========================================

export interface WorldSpace3DConfig {
  origin: [number, number, number]; // Global origin: [0, 0, 0]
  coordinateSystem: 'y_up_right_handed'; // Standard Cartesian 3D Right-Handed (Y = Up, -Z = Forward)
  unitScale: 'meters'; // Spatial metric scale (1 unit = 1.0 meter)
  gridExtentMeters: number; // Viewport reference grid bounds (e.g. 500m)
  solidRenderPipeline: boolean; // Early-Z solid polygonal rendering (0% alpha overdraw)
}

export interface SubSceneOrchestratorConfig {
  activeSubSceneId: string;
  isSubSceneLoaded: boolean;
  transitionType: 'instant' | 'fade_black' | 'cross_dissolve' | 'void_wipe';
  transitionDurationMs: number;
  unloadOnMenuOpen: boolean;
}

export interface MainSceneConfig {
  id: string;
  name: string;
  version: string;
  // Universal Game Pipeline
  splashScreen: SplashScreenConfig;
  startMenu: StartMenuConfig;
  settings: GameSettingsConfig;
  saveSystem: SaveLoadSystemConfig;
  persistentHUD: PersistentHUDConfig;
  // Global Empty 3D Coordinate Space (No physics/gravity managed here)
  worldSpace3D: WorldSpace3DConfig;
  // Sub-scene Orchestration (Strictly 1 loaded at a time)
  orchestrator: SubSceneOrchestratorConfig;
  // Visual GUI Architecture
  guiScreens: GuiScreenDefinition[];
  guiTheme: GuiThemeConfig;
  activeGuiId: DefaultGuiId;
}

// ==========================================
// 2. SUB-SCENE CONTAINER CONFIGURATION
// (Owns all Light Sources, Shadow Sources, & Skyboxes)
// ==========================================

export type SkyboxType =
  | 'ashen_dusk'
  | 'void_horizon'
  | 'celestial_dawn'
  | 'overworld_noon'
  | 'deep_space'
  | 'volcanic_caldera';

export interface SubSceneSkyboxConfig {
  type: SkyboxType;
  tintColor: string;
  exposure: number;
  horizonBlur: number;
}

export interface SubSceneLightSourcesConfig {
  sun: {
    enabled: boolean;
    color: string;
    intensity: number;
    direction: [number, number, number];
    pitchDeg: number;
    yawDeg: number;
  };
  ambient: {
    skyColor: string;
    groundColor: string;
    intensity: number;
  };
  fog: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
    density: number;
  };
}

export interface SubSceneShadowSourcesConfig {
  enabled: boolean;
  castFromSun: boolean;
  resolution: 512 | 1024 | 2048 | 4096;
  shadowDistance: number;
  bias: number;
  normalBias: number;
  contactShadows: boolean;
  shadowIntensity: number;
}

export interface Transform3D {
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in degrees
  scale: [number, number, number];
}

export interface PlacedObjectInstance {
  instanceId: string;
  objectId: string; // References a MasonGameObject
  name: string;
  transform: Transform3D;
  customProperties?: Record<string, any>;
  isVisible: boolean;
}

export interface SubSceneDefinition {
  id: string;
  name: string;
  fileName: string; // e.g. "ashen_outpost.subscene"
  description: string;
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
  spawnPoint: {
    position: [number, number, number];
    rotationY: number;
  };
  // Sub-Scene Managed Atmosphere, Lighting, Shadows & Physics
  skybox: SubSceneSkyboxConfig;
  lighting: SubSceneLightSourcesConfig;
  shadows: SubSceneShadowSourcesConfig;
  physics: SubScenePhysicsConfig;
  musicTrack?: string;
  placedObjects: PlacedObjectInstance[];
  createdAt: string;
  updatedAt: string;
}

export interface SubScenePhysicsConfig {
  enabled: boolean;
  gravity: [number, number, number]; // Local sub-scene gravity vector in m/s² (e.g. [0, -9.81, 0])
  simulationRateHz: number; // e.g. 60Hz
}

// ==========================================
// 3. OBJECTS (ENTITY-COMPONENT-GRAPH)
// ==========================================

export type ComponentType =
  | 'visual_mesh'
  | 'visual_sprite'
  | 'visual_terrain'
  | 'visual_particle'
  | 'collider'
  | 'rigidbody'
  | 'light'
  | 'audio_source'
  | 'player_controller'
  | 'fray_combatant'
  | 'interactable_trigger';

export interface VisualMeshComponent {
  type: 'visual_mesh';
  model3dFileName?: string;
  primitiveType?: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'capsule';
  color: string;
  roughness: number;
  metalness: number;
  castShadows: boolean;
  receiveShadows: boolean;
}

export interface VisualSpriteComponent {
  type: 'visual_sprite';
  spriteFileName?: string;
  billboardMode: 'face_camera' | 'axis_aligned' | 'fixed_plane';
  pixelsPerUnit: number;
  tintColor: string;
  activeAnimation?: string;
}

export interface VisualTerrainComponent {
  type: 'visual_terrain';
  terrainFileName?: string;
  isBakedStaticChunk: boolean;
  triplanarMaterialId?: string;
}

export interface VisualParticleComponent {
  type: 'visual_particle';
  particleFileName?: string;
  emitterRate: number;
  playOnStart: boolean;
}

export interface ColliderComponent {
  type: 'collider';
  shape: 'box' | 'sphere' | 'capsule';
  size: [number, number, number]; // dimensions / radius
  isTrigger: boolean;
  collisionTag: string;
}

export interface RigidbodyComponent {
  type: 'rigidbody';
  bodyType: 'static' | 'kinematic' | 'dynamic';
  mass: number;
  gravityScale: number;
  drag: number;
  freezeRotation: [boolean, boolean, boolean];
}

export interface LightComponent {
  type: 'light';
  lightType: 'point' | 'spot';
  color: string;
  intensity: number;
  radius: number;
  castShadows: boolean;
}

export interface AudioSourceComponent {
  type: 'audio_source';
  soundCueId: string;
  volume: number;
  loop: boolean;
  spatialAudio: boolean;
  maxDistance: number;
}

export interface PlayerControllerComponent {
  type: 'player_controller';
  genre: GameGenreControllerType;
  moveSpeed: number;
  sprintMultiplier: number;
  jumpImpulse: number;
  cameraDistance: number;
  cameraSmoothing: number;
}

export interface FrayCombatantComponent {
  type: 'fray_combatant';
  loadout: FrayCombatantLoadout;
}

export interface InteractableTriggerComponent {
  type: 'interactable_trigger';
  interactionRadius: number;
  promptText: string;
  requireButtonPress: boolean;
  targetSubSceneTransitionId?: string;
}

export type MasonComponent =
  | VisualMeshComponent
  | VisualSpriteComponent
  | VisualTerrainComponent
  | VisualParticleComponent
  | ColliderComponent
  | RigidbodyComponent
  | LightComponent
  | AudioSourceComponent
  | PlayerControllerComponent
  | FrayCombatantComponent
  | InteractableTriggerComponent;

// ==========================================
// 4. OBJECT LOGIC GRAPH (FUNCTIONS & EVENTS)
// ==========================================

export type LogicNodeCategory = 'event' | 'condition' | 'action' | 'variable';

export interface LogicNode {
  id: string;
  type: string;
  name: string;
  category: LogicNodeCategory;
  x: number;
  y: number;
  parameters: Record<string, any>;
  inputs: { id: string; label: string; dataType: string }[];
  outputs: { id: string; label: string; dataType: string }[];
}

export interface LogicEdge {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface ObjectLogicGraph {
  nodes: LogicNode[];
  edges: LogicEdge[];
}

export interface MasonGameObject {
  id: string;
  name: string;
  category: 'character' | 'prop' | 'npc' | 'hazard' | 'trigger' | 'vehicle' | 'custom';
  baseTransform: Transform3D; // Base empty object in 3D space
  components: MasonComponent[];
  logicGraph: ObjectLogicGraph;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// DEFAULT FACTORY FUNCTIONS
// ==========================================

export const createDefaultMainSceneConfig = (): MainSceneConfig => ({
  id: 'main_scene_core',
  name: 'Main Game Root Scene',
  version: '1.0.0',
  splashScreen: {
    studioName: 'MASON PROTOCOL ENGINE',
    studioTagline: 'Architecting the High-Performance Fray Universe',
    logoGlyph: 'Shield',
    durationMs: 2500,
    fadeDurationMs: 600,
    backgroundColor: '#09090b',
    accentColor: '#f59e0b',
    skipAllowed: true
  },
  startMenu: {
    title: 'ECHOES OF THE ASHEN VOID',
    subtitle: 'Fray Protocol Combat Chronicle',
    versionLabel: 'v0.435',
    backgroundType: '3d_scene',
    menuItems: [
      { id: 'item_play', label: 'ENTER SUB-SCENE', action: 'new_game', iconName: 'Play' },
      { id: 'item_foci', label: 'FOCI & INSIGNIA LOADOUT', action: 'foci_armory', iconName: 'Shield' },
      { id: 'item_settings', label: 'SYSTEM SETTINGS', action: 'settings', iconName: 'Sliders' },
      { id: 'item_load', label: 'LOAD PROTOCOL SAVE', action: 'load_game', iconName: 'HardDrive' }
    ]
  },
  settings: {
    audio: { masterVolume: 85, musicVolume: 70, sfxVolume: 90, ambientVolume: 65, voiceVolume: 80 },
    display: { resolution: '1280x800', fullscreen: false, vsync: true, targetFrameRate: 60, fovDeg: 80, vrsEnabled: false },
    gameplay: { difficulty: 'tactical', cameraSensitivity: 1.2, invertY: false, screenShake: true, floatingCombatText: true }
  },
  saveSystem: {
    maxSlots: 3,
    activeSlotId: 'slot_1',
    autoSaveIntervalMinutes: 5,
    slots: [
      {
        id: 'slot_1',
        label: 'Ashen Outpost - Chapter I',
        timestamp: new Date().toISOString(),
        currentMapName: 'Ashen Frontier',
        playtimeSeconds: 4200,
        playerLevel: 4,
        valorPoints: 65,
        actionPoints: 100,
        equippedInsigniaId: 'insignia_vanguard'
      }
    ]
  },
  persistentHUD: {
    showHealth: true,
    showManaOrAP: true,
    showValorMeter: true,
    showFociRadial: true,
    showMinimap: true,
    showActionFeed: true,
    hudScale: 1.0,
    accentColor: '#f59e0b'
  },
  worldSpace3D: {
    origin: [0, 0, 0],
    coordinateSystem: 'y_up_right_handed',
    unitScale: 'meters',
    gridExtentMeters: 500,
    solidRenderPipeline: true
  },
  orchestrator: {
    activeSubSceneId: 'subscene_ashen_outpost',
    isSubSceneLoaded: true,
    transitionType: 'void_wipe',
    transitionDurationMs: 400,
    unloadOnMenuOpen: false
  },
  guiScreens: createDefaultGuiScreens(),
  guiTheme: PRESET_GUI_THEMES[0],
  activeGuiId: 'start_menu'
});

export const createDefaultSubScenes = (): SubSceneDefinition[] => [
  {
    id: 'subscene_ashen_outpost',
    name: 'Ashen Outpost (Sub-Scene 1)',
    fileName: 'ashen_outpost.subscene',
    description: 'Frontier watchtower fortress overlooking the jagged volcanic steppes. First playable stage.',
    bounds: { width: 120, height: 40, depth: 120 },
    spawnPoint: { position: [0, 1, 0], rotationY: 0 },
    skybox: {
      type: 'ashen_dusk',
      tintColor: '#f97316',
      exposure: 1.1,
      horizonBlur: 0.15
    },
    lighting: {
      sun: {
        enabled: true,
        color: '#fef08a',
        intensity: 1.35,
        direction: [0.6, -1.0, 0.4],
        pitchDeg: 45,
        yawDeg: 120
      },
      ambient: {
        skyColor: '#fdba74',
        groundColor: '#1e293b',
        intensity: 0.45
      },
      fog: {
        enabled: true,
        color: '#0f172a',
        near: 40,
        far: 180,
        density: 0.015
      }
    },
    shadows: {
      enabled: true,
      castFromSun: true,
      resolution: 2048,
      shadowDistance: 90,
      bias: 0.0005,
      normalBias: 0.02,
      contactShadows: true,
      shadowIntensity: 0.85
    },
    physics: {
      enabled: true,
      gravity: [0, -9.81, 0],
      simulationRateHz: 60
    },
    musicTrack: 'track_ashen_march',
    placedObjects: [
      {
        instanceId: 'inst_hero_player',
        objectId: 'obj_hero_vanguard',
        name: 'Player Vanguard',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        isVisible: true
      },
      {
        instanceId: 'inst_outpost_tower',
        objectId: 'obj_watchtower_prop',
        name: 'Ashen Stone Watchtower',
        transform: { position: [12, 0, -8], rotation: [0, 25, 0], scale: [1.2, 1.2, 1.2] },
        isVisible: true
      },
      {
        instanceId: 'inst_brazier_fire',
        objectId: 'obj_flame_brazier',
        name: 'Sanctum Flame Brazier',
        transform: { position: [4, 0, -3], rotation: [0, 0, 0], scale: [1, 1, 1] },
        isVisible: true
      },
      {
        instanceId: 'inst_ashen_sentinel',
        objectId: 'obj_ashen_sentinel_mob',
        name: 'Patrolling Ashen Sentinel',
        transform: { position: [-14, 0, 10], rotation: [0, 140, 0], scale: [1.1, 1.1, 1.1] },
        isVisible: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'subscene_ruined_sanctum',
    name: 'Ruined Sanctum (Sub-Scene 2)',
    fileName: 'ruined_sanctum.subscene',
    description: 'Ancient hollowed stone cathedral buried in void rifts and crystalline monoliths.',
    bounds: { width: 160, height: 60, depth: 160 },
    spawnPoint: { position: [0, 1, -20], rotationY: 180 },
    skybox: {
      type: 'void_horizon',
      tintColor: '#a855f7',
      exposure: 0.9,
      horizonBlur: 0.3
    },
    lighting: {
      sun: {
        enabled: true,
        color: '#c084fc',
        intensity: 0.85,
        direction: [0.2, -1.0, 0.8],
        pitchDeg: 65,
        yawDeg: 210
      },
      ambient: {
        skyColor: '#312e81',
        groundColor: '#09090b',
        intensity: 0.35
      },
      fog: {
        enabled: true,
        color: '#1e1b4b',
        near: 20,
        far: 140,
        density: 0.028
      }
    },
    shadows: {
      enabled: true,
      castFromSun: true,
      resolution: 2048,
      shadowDistance: 70,
      bias: 0.0004,
      normalBias: 0.015,
      contactShadows: true,
      shadowIntensity: 0.9
    },
    physics: {
      enabled: true,
      gravity: [0, -4.5, 0], // Low-gravity void realm
      simulationRateHz: 60
    },
    musicTrack: 'track_sanctum_choral',
    placedObjects: [
      {
        instanceId: 'inst_hero_sanctum',
        objectId: 'obj_hero_vanguard',
        name: 'Player Vanguard',
        transform: { position: [0, 0, -20], rotation: [0, 180, 0], scale: [1, 1, 1] },
        isVisible: true
      },
      {
        instanceId: 'inst_void_monolith',
        objectId: 'obj_void_crystal_pillar',
        name: 'Resonating Void Monolith',
        transform: { position: [0, 0, 10], rotation: [0, 45, 0], scale: [1.5, 2.5, 1.5] },
        isVisible: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const createDefaultObjects = (): MasonGameObject[] => [
  {
    id: 'obj_hero_vanguard',
    name: 'Vanguard Hero (Fray Champion)',
    category: 'character',
    baseTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [
      {
        type: 'visual_mesh',
        model3dFileName: 'hero_knight.model3d',
        primitiveType: 'capsule',
        color: '#0284c7',
        roughness: 0.4,
        metalness: 0.6,
        castShadows: true,
        receiveShadows: true
      },
      {
        type: 'player_controller',
        genre: 'third_person_rpg',
        moveSpeed: 6.5,
        sprintMultiplier: 1.4,
        jumpImpulse: 12.0,
        cameraDistance: 6.0,
        cameraSmoothing: 0.12
      },
      {
        type: 'fray_combatant',
        loadout: createDefaultCombatantLoadout()
      },
      {
        type: 'collider',
        shape: 'capsule',
        size: [0.8, 1.8, 0.8],
        isTrigger: false,
        collisionTag: 'player'
      },
      {
        type: 'rigidbody',
        bodyType: 'dynamic',
        mass: 75,
        gravityScale: 1.0,
        drag: 0.05,
        freezeRotation: [true, false, true]
      }
    ],
    logicGraph: {
      nodes: [
        {
          id: 'node_spawn',
          type: 'event_spawn',
          name: 'On Object Spawn',
          category: 'event',
          x: 40,
          y: 80,
          parameters: {},
          inputs: [],
          outputs: [{ id: 'out_exec', label: 'Exec', dataType: 'flow' }]
        },
        {
          id: 'node_check_ap',
          type: 'cond_ap_check',
          name: 'Condition: AP >= 25',
          category: 'condition',
          x: 280,
          y: 80,
          parameters: { minAP: 25 },
          inputs: [{ id: 'in_exec', label: 'Exec', dataType: 'flow' }],
          outputs: [
            { id: 'out_true', label: 'True (Has AP)', dataType: 'flow' },
            { id: 'out_false', label: 'False (Exhausted)', dataType: 'flow' }
          ]
        },
        {
          id: 'node_spend_ap',
          type: 'act_spend_ap',
          name: 'Action: Spend 25 AP & Channel Kinetic Strike',
          category: 'action',
          x: 540,
          y: 60,
          parameters: { apCost: 25, focusId: 'focus_kinetic' },
          inputs: [{ id: 'in_exec', label: 'Exec', dataType: 'flow' }],
          outputs: [{ id: 'out_exec', label: 'Then', dataType: 'flow' }]
        },
        {
          id: 'node_gain_valor',
          type: 'act_gain_valor',
          name: 'Action: Add +15 Valor Points (Momentum)',
          category: 'action',
          x: 820,
          y: 60,
          parameters: { valorAmount: 15 },
          inputs: [{ id: 'in_exec', label: 'Exec', dataType: 'flow' }],
          outputs: []
        }
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'node_spawn', fromPortId: 'out_exec', toNodeId: 'node_check_ap', toPortId: 'in_exec' },
        { id: 'edge_2', fromNodeId: 'node_check_ap', fromPortId: 'out_true', toNodeId: 'node_spend_ap', toPortId: 'in_exec' },
        { id: 'edge_3', fromNodeId: 'node_spend_ap', fromPortId: 'out_exec', toNodeId: 'node_gain_valor', toPortId: 'in_exec' }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'obj_watchtower_prop',
    name: 'Ashen Watchtower',
    category: 'prop',
    baseTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [
      {
        type: 'visual_mesh',
        primitiveType: 'cylinder',
        color: '#475569',
        roughness: 0.85,
        metalness: 0.1,
        castShadows: true,
        receiveShadows: true
      },
      {
        type: 'collider',
        shape: 'box',
        size: [4.0, 12.0, 4.0],
        isTrigger: false,
        collisionTag: 'environment'
      },
      {
        type: 'rigidbody',
        bodyType: 'static',
        mass: 0,
        gravityScale: 0,
        drag: 0,
        freezeRotation: [true, true, true]
      }
    ],
    logicGraph: {
      nodes: [
        {
          id: 'node_tick',
          type: 'event_tick',
          name: 'On Tick (Idle)',
          category: 'event',
          x: 60,
          y: 80,
          parameters: {},
          inputs: [],
          outputs: [{ id: 'out_exec', label: 'Tick', dataType: 'flow' }]
        }
      ],
      edges: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'obj_flame_brazier',
    name: 'Sanctum Flame Brazier',
    category: 'prop',
    baseTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [
      {
        type: 'visual_mesh',
        primitiveType: 'cone',
        color: '#78350f',
        roughness: 0.7,
        metalness: 0.3,
        castShadows: true,
        receiveShadows: true
      },
      {
        type: 'visual_particle',
        particleFileName: 'fire_embers.particle',
        emitterRate: 35,
        playOnStart: true
      },
      {
        type: 'light',
        lightType: 'point',
        color: '#f97316',
        intensity: 2.2,
        radius: 8.0,
        castShadows: true
      },
      {
        type: 'interactable_trigger',
        interactionRadius: 2.5,
        promptText: 'Rest at Sanctum Flame (Restores AP & Saves)',
        requireButtonPress: true
      }
    ],
    logicGraph: {
      nodes: [
        {
          id: 'node_interact',
          type: 'event_interact',
          name: 'On Player Interact [E]',
          category: 'event',
          x: 40,
          y: 80,
          parameters: {},
          inputs: [],
          outputs: [{ id: 'out_exec', label: 'Interact', dataType: 'flow' }]
        },
        {
          id: 'node_restore_ap',
          type: 'act_restore_ap',
          name: 'Action: Restore 100% AP & Trigger Checkpoint',
          category: 'action',
          x: 320,
          y: 80,
          parameters: { fullRestore: true },
          inputs: [{ id: 'in_exec', label: 'Exec', dataType: 'flow' }],
          outputs: []
        }
      ],
      edges: [
        { id: 'edge_brazier_1', fromNodeId: 'node_interact', fromPortId: 'out_exec', toNodeId: 'node_restore_ap', toPortId: 'in_exec' }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'obj_ashen_sentinel_mob',
    name: 'Ashen Sentinel (Hostile)',
    category: 'hazard',
    baseTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [
      {
        type: 'visual_mesh',
        primitiveType: 'cube',
        color: '#dc2626',
        roughness: 0.5,
        metalness: 0.5,
        castShadows: true,
        receiveShadows: true
      },
      {
        type: 'collider',
        shape: 'box',
        size: [1.2, 2.0, 1.2],
        isTrigger: false,
        collisionTag: 'enemy'
      },
      {
        type: 'rigidbody',
        bodyType: 'dynamic',
        mass: 90,
        gravityScale: 1.0,
        drag: 0.1,
        freezeRotation: [true, false, true]
      }
    ],
    logicGraph: {
      nodes: [
        {
          id: 'node_mob_detect',
          type: 'event_proximity',
          name: 'On Player Within 8m',
          category: 'event',
          x: 40,
          y: 80,
          parameters: { radius: 8 },
          inputs: [],
          outputs: [{ id: 'out_exec', label: 'Alert', dataType: 'flow' }]
        },
        {
          id: 'node_mob_attack',
          type: 'act_hostile_strike',
          name: 'Action: Execute Void Slash (Deals 18 Dmg)',
          category: 'action',
          x: 320,
          y: 80,
          parameters: { damage: 18 },
          inputs: [{ id: 'in_exec', label: 'Exec', dataType: 'flow' }],
          outputs: []
        }
      ],
      edges: [
        { id: 'edge_mob_1', fromNodeId: 'node_mob_detect', fromPortId: 'out_exec', toNodeId: 'node_mob_attack', toPortId: 'in_exec' }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'obj_void_crystal_pillar',
    name: 'Void Monolith Pillar',
    category: 'prop',
    baseTransform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [
      {
        type: 'visual_mesh',
        primitiveType: 'cylinder',
        color: '#7c3aed',
        roughness: 0.2,
        metalness: 0.9,
        castShadows: true,
        receiveShadows: true
      },
      {
        type: 'light',
        lightType: 'point',
        color: '#c084fc',
        intensity: 3.5,
        radius: 12.0,
        castShadows: true
      },
      {
        type: 'interactable_trigger',
        interactionRadius: 3.0,
        promptText: 'Warp back to Ashen Outpost',
        requireButtonPress: true,
        targetSubSceneTransitionId: 'subscene_ashen_outpost'
      }
    ],
    logicGraph: {
      nodes: [
        {
          id: 'node_portal_trigger',
          type: 'event_interact',
          name: 'On Warp Trigger',
          category: 'event',
          x: 40,
          y: 80,
          parameters: {},
          inputs: [],
          outputs: [{ id: 'out_exec', label: 'Warp', dataType: 'flow' }]
        },
        {
          id: 'node_switch_scene',
          type: 'act_switch_subscene',
          name: 'Action: Load Sub-Scene [Ashen Outpost]',
          category: 'action',
          x: 340,
          y: 80,
          parameters: { targetSubSceneId: 'subscene_ashen_outpost' },
          inputs: [{ id: 'in_exec', label: 'Exec', dataType: 'flow' }],
          outputs: []
        }
      ],
      edges: [
        { id: 'edge_portal_1', fromNodeId: 'node_portal_trigger', fromPortId: 'out_exec', toNodeId: 'node_switch_scene', toPortId: 'in_exec' }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
