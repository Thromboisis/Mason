/**
 * Fray Universe Gameplay Mechanics & Universal Game Pipeline Schema
 * 
 * Defines the core universal game framework needed for any genre,
 * paired with the persistent Fray universe gameplay mechanics:
 * - 9-Foci Loadouts
 * - Insignia System
 * - Valor Points Economy
 * - Action Points (AP) Budgeting
 * - Modular Player Controller Archetypes
 */

import { DamageType, ConditionType } from './schema';

// ==========================================
// 1. UNIVERSAL GAME PIPELINE
// ==========================================

export type GameGenreControllerType = 
  | 'third_person_rpg'
  | 'first_person_shooter'
  | 'rts_commander'
  | 'sidescroller_platformer';

export interface SplashScreenConfig {
  studioName: string;
  studioTagline: string;
  logoGlyph: string; // SVG or icon identifier
  durationMs: number;
  fadeDurationMs: number;
  backgroundColor: string;
  accentColor: string;
  audioStingerId?: string;
  skipAllowed: boolean;
}

export interface StartMenuConfig {
  title: string;
  subtitle: string;
  versionLabel: string;
  backgroundType: 'parallax_biome' | '3d_scene' | 'cinematic_loop' | 'dark_gradient';
  backdropReferenceId?: string; // Biome or Scene file name
  menuItems: {
    id: string;
    label: string;
    action: 'new_game' | 'continue' | 'load_game' | 'settings' | 'foci_armory' | 'credits' | 'quit';
    iconName?: string;
    disabled?: boolean;
  }[];
  musicTrackId?: string;
}

export interface GameSettingsConfig {
  audio: {
    masterVolume: number; // 0 to 100
    musicVolume: number;
    sfxVolume: number;
    ambientVolume: number;
    voiceVolume: number;
  };
  display: {
    resolution: string; // e.g. "1280x800", "1920x1080"
    fullscreen: boolean;
    vsync: boolean;
    targetFrameRate: 30 | 60 | 90 | 120 | 144 | 0; // 90 = Steam Deck target
    fovDeg: number; // 60 to 110
    vrsEnabled: boolean;
  };
  gameplay: {
    difficulty: 'story' | 'tactical' | 'fray_hardened' | 'permadeath';
    cameraSensitivity: number;
    invertY: boolean;
    screenShake: boolean;
    floatingCombatText: boolean;
  };
}

export interface SaveSlotData {
  slotId: number;
  saveName: string;
  timestamp: string;
  playtimeSeconds: number;
  currentMapOrScene: string;
  playerLevel: number;
  equippedInsigniaId: string;
  activeFociLoadoutId: string;
  valorPoints: number;
  actionPoints: number;
  previewThumbnailUrl?: string;
  progressionFlags: Record<string, boolean>;
}

export interface CutsceneTrackKeyframe {
  timeMs: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  actorAnimations?: { actorId: string; animationClip: string }[];
  dialogueSpeaker?: string;
  dialogueText?: string;
  soundCue?: string;
}

export interface CutsceneDefinition {
  id: string;
  name: string;
  durationMs: number;
  letterboxEnabled: boolean;
  canSkip: boolean;
  keyframes: CutsceneTrackKeyframe[];
}

export interface PlayerControllerConfig {
  genreType: GameGenreControllerType;
  walkSpeed: number;
  runSpeed: number;
  dashSpeed: number;
  jumpVelocity: number;
  gravity: number;
  combatLockOnRange: number;
  dodgeStaminaCost: number;
  lightAttackApCost: number;
  heavyAttackApCost: number;
  mouseSensitivity: number;
  invertPitch: boolean;
}

// ==========================================
// 2. FRAY UNIVERSE CORE MECHANICS
// ==========================================

export type FociCategory = 
  | 'primary_strike'    // Slot 1: Main weapon stance / offensive technique
  | 'offhand_channel'   // Slot 2: Secondary conduit / focus catalyst
  | 'defensive_aegis'   // Slot 3: Ward, shield, parry stance
  | 'kinetic_surge'     // Slot 4: Physical momentum / stagger / gap closer
  | 'thermal_cryo'      // Slot 5: Thermal fire or cryo frost modulation
  | 'galvanic_conduit'  // Slot 6: Lightning / shock chain / overdrive
  | 'void_collapse'     // Slot 7: Gravitational well / dark singularity
  | 'radiant_dawn'      // Slot 8: Light pierce / healing ward / blinding flare
  | 'psionic_transcend';// Slot 9: Mind blade / telekinetic shove / perception dilation

export interface FociSlotDefinition {
  slotIndex: number; // 0 to 8 (9 Foci total)
  slotName: string;
  category: FociCategory;
  recommendedModality: DamageType;
  description: string;
}

export const FRAY_9_FOCI_SLOTS: FociSlotDefinition[] = [
  { slotIndex: 0, slotName: 'Primary Stance', category: 'primary_strike', recommendedModality: 'kinetic', description: 'Core weapon rhythm, direct strikes, and primary attack chains.' },
  { slotIndex: 1, slotName: 'Offhand Channel', category: 'offhand_channel', recommendedModality: 'galvanic', description: 'Catalyst conduit for rapid spell discharge and offhand parries.' },
  { slotIndex: 2, slotName: 'Aegis Ward', category: 'defensive_aegis', recommendedModality: 'kinetic', description: 'Shielding barrier, deflection stance, and impact mitigation.' },
  { slotIndex: 3, slotName: 'Kinetic Momentum', category: 'kinetic_surge', recommendedModality: 'kinetic', description: 'Gap-closing dashes, staggering bashes, and wall-shattering bursts.' },
  { slotIndex: 4, slotName: 'Thermal / Cryo', category: 'thermal_cryo', recommendedModality: 'thermal', description: 'Flash-freeze crowd control or searing armor-melting thermite.' },
  { slotIndex: 5, slotName: 'Galvanic Arc', category: 'galvanic_conduit', recommendedModality: 'galvanic', description: 'High-frequency chain shock that stuns and charges Action Points.' },
  { slotIndex: 6, slotName: 'Void Singularity', category: 'void_collapse', recommendedModality: 'void', description: 'Dark matter vortex that pulls enemies and crushes armor pools.' },
  { slotIndex: 7, slotName: 'Radiant Dawn', category: 'radiant_dawn', recommendedModality: 'radiant', description: 'Piercing astral lances, cleansing wards, and allied revitalizations.' },
  { slotIndex: 8, slotName: 'Psionic Will', category: 'psionic_transcend', recommendedModality: 'psionic', description: 'Time-dilation reflex, telekinetic parry, and psychic disruption.' },
];

export interface FrayFociAbility {
  id: string;
  name: string;
  category: FociCategory;
  modality: DamageType;
  description: string;
  actionPointCost: number; // AP needed to execute
  valorPointCost: number;  // Optional VP for overdrive
  cooldownSeconds: number;
  damage: number;
  staggerDamage: number;
  rangeMeters: number;
  conditionInflicted?: ConditionType;
  conditionDurationSeconds?: number;
  iconGlyph: string;
}

export interface FrayLoadout {
  id: string;
  name: string;
  description: string;
  insigniaId: string;
  equippedFoci: (string | null)[]; // Array of 9 Foci Ability IDs matching FRAY_9_FOCI_SLOTS
  primaryWeaponName: string;
  armorClass: 'light_scout' | 'medium_warden' | 'heavy_ironclad';
  totalActionPoints: number;
  apRegenPerSec: number;
}

export interface FrayInsignia {
  id: string;
  name: string;
  title: string;
  factionOrOrder: string;
  rarity: 'standard' | 'hallowed' | 'relic' | 'ascendant';
  sigilIcon: string;
  primaryAffinity: DamageType;
  passivePerkName: string;
  passivePerkDescription: string;
  valorGenerationBonusPct: number; // e.g. +20% Valor on perfect parry
  actionPointBonus: number;        // e.g. +15 Max AP
  armorBonus: number;
}

export interface ValorPointsState {
  current: number;
  max: number;            // Default 100
  gainOnParry: number;    // e.g. 15
  gainOnStagger: number;  // e.g. 25
  gainOnCombo: number;    // e.g. 5
  decayRatePerSec: number;// Drops slowly if idle (e.g. 2 VP/sec after 4s)
  overdriveThreshold: number; // 75+ enables Overdrive Focus
}

export interface ActionPointsState {
  current: number;
  max: number;            // Default 100
  regenPerSecond: number; // e.g. 24 AP/sec
  costs: {
    lightStrike: number;
    heavyStrike: number;
    dodgeRoll: number;
    parryBlock: number;
    sprintPerSec: number;
  };
}

// ==========================================
// 3. COMPLETE GAME RUNTIME ARCHITECTURE BUNDLE
// ==========================================

export interface FrayGameCoreBundle {
  version: string;
  gameTitle: string;
  gameGenre: GameGenreControllerType;
  splashScreen: SplashScreenConfig;
  startMenu: StartMenuConfig;
  settings: GameSettingsConfig;
  playerController: PlayerControllerConfig;
  activeLoadout: FrayLoadout;
  insignias: FrayInsignia[];
  fociCatalog: FrayFociAbility[];
  savedSlots: SaveSlotData[];
  cutscenes: CutsceneDefinition[];
  valorConfig: ValorPointsState;
  actionConfig: ActionPointsState;
}

// Default Presets
export const DEFAULT_FRAY_INSIGNIAS: FrayInsignia[] = [
  {
    id: 'insignia_ashen_warden',
    name: 'Warden of the Ashen Steppes',
    title: 'The Unyielding Vanguard',
    factionOrOrder: 'Order of the Ashen Gate',
    rarity: 'relic',
    sigilIcon: '🛡️',
    primaryAffinity: 'kinetic',
    passivePerkName: 'Ironclad Resolve',
    passivePerkDescription: 'Successful timed parries grant 20 Valor Points and trigger an immediate 30% AP surge.',
    valorGenerationBonusPct: 25,
    actionPointBonus: 15,
    armorBonus: 12,
  },
  {
    id: 'insignia_storm_conduit',
    name: 'Crest of the Galvanic Storm',
    title: 'Conduit Initiate',
    factionOrOrder: 'The Fulgurite Conclave',
    rarity: 'hallowed',
    sigilIcon: '⚡',
    primaryAffinity: 'galvanic',
    passivePerkName: 'Static Overdrive',
    passivePerkDescription: 'Every third light strike discharges chain lightning that restores 12 Action Points.',
    valorGenerationBonusPct: 15,
    actionPointBonus: 25,
    armorBonus: 6,
  },
  {
    id: 'insignia_void_stalker',
    name: 'Eye of the Abyssal Void',
    title: 'Void Drifter',
    factionOrOrder: 'Null Siphon Collective',
    rarity: 'ascendant',
    sigilIcon: '🌌',
    primaryAffinity: 'void',
    passivePerkName: 'Singularity Drift',
    passivePerkDescription: 'Dodge rolls leave a lingering micro-singularity that pulls foes and refunds 50% dodge AP.',
    valorGenerationBonusPct: 30,
    actionPointBonus: 20,
    armorBonus: 8,
  },
];

export const DEFAULT_FRAY_FOCI_CATALOG: FrayFociAbility[] = [
  // 1. Primary Strike
  {
    id: 'foci_cleaving_strike',
    name: 'Cleaving Edge',
    category: 'primary_strike',
    modality: 'kinetic',
    description: 'A swift horizontal sword slash that cleaves forward arcs.',
    actionPointCost: 15,
    valorPointCost: 0,
    cooldownSeconds: 0,
    damage: 35,
    staggerDamage: 20,
    rangeMeters: 2.2,
    iconGlyph: '⚔️',
  },
  // 2. Offhand Channel
  {
    id: 'foci_galvanic_burst',
    name: 'Arc Spark Discharge',
    category: 'offhand_channel',
    modality: 'galvanic',
    description: 'Channeled electrical blast that arcs across multiple close combatants.',
    actionPointCost: 24,
    valorPointCost: 0,
    cooldownSeconds: 2.5,
    damage: 42,
    staggerDamage: 15,
    rangeMeters: 8.0,
    conditionInflicted: 'shocked',
    conditionDurationSeconds: 3.0,
    iconGlyph: '⚡',
  },
  // 3. Defensive Aegis
  {
    id: 'foci_bulwark_parry',
    name: 'Aegis Deflection',
    category: 'defensive_aegis',
    modality: 'kinetic',
    description: 'A reinforced guard stance. Timed parries negate 100% damage and generate 25 Valor.',
    actionPointCost: 12,
    valorPointCost: 0,
    cooldownSeconds: 0.5,
    damage: 0,
    staggerDamage: 45,
    rangeMeters: 1.5,
    iconGlyph: '🛡️',
  },
  // 4. Kinetic Surge
  {
    id: 'foci_rampart_slam',
    name: 'Battering Ram Charge',
    category: 'kinetic_surge',
    modality: 'kinetic',
    description: 'A forceful forward dash that bulldozes through light targets and destabilizes guards.',
    actionPointCost: 28,
    valorPointCost: 0,
    cooldownSeconds: 3.5,
    damage: 55,
    staggerDamage: 65,
    rangeMeters: 6.0,
    conditionInflicted: 'vulnerable',
    conditionDurationSeconds: 2.5,
    iconGlyph: '💥',
  },
  // 5. Thermal / Cryo
  {
    id: 'foci_pyre_lance',
    name: 'Thermite Brand',
    category: 'thermal_cryo',
    modality: 'thermal',
    description: 'Pierces through heavy armor plates with persistent chemical heat combustion.',
    actionPointCost: 32,
    valorPointCost: 0,
    cooldownSeconds: 4.0,
    damage: 60,
    staggerDamage: 25,
    rangeMeters: 4.5,
    conditionInflicted: 'burning',
    conditionDurationSeconds: 4.0,
    iconGlyph: '🔥',
  },
  // 6. Galvanic Arc
  {
    id: 'foci_chain_tempest',
    name: 'Static Overcharge',
    category: 'galvanic_conduit',
    modality: 'galvanic',
    description: 'Electrifies ground terrain, creating a crackling shock field.',
    actionPointCost: 35,
    valorPointCost: 10,
    cooldownSeconds: 5.0,
    damage: 68,
    staggerDamage: 30,
    rangeMeters: 7.0,
    conditionInflicted: 'shocked',
    conditionDurationSeconds: 4.5,
    iconGlyph: '🌩️',
  },
  // 7. Void Singularity
  {
    id: 'foci_void_vortex',
    name: 'Abyssal Well',
    category: 'void_collapse',
    modality: 'void',
    description: 'Implodes space at targeted coordinate, drawing all nearby foes into a crushing cluster.',
    actionPointCost: 45,
    valorPointCost: 25,
    cooldownSeconds: 8.0,
    damage: 85,
    staggerDamage: 80,
    rangeMeters: 12.0,
    conditionInflicted: 'stunned',
    conditionDurationSeconds: 1.8,
    iconGlyph: '🕳️',
  },
  // 8. Radiant Dawn
  {
    id: 'foci_astral_flare',
    name: 'Dawn Pillar',
    category: 'radiant_dawn',
    modality: 'radiant',
    description: 'Calls down a column of incandescent celestial energy that purges negative debuffs.',
    actionPointCost: 40,
    valorPointCost: 30,
    cooldownSeconds: 9.0,
    damage: 90,
    staggerDamage: 35,
    rangeMeters: 10.0,
    iconGlyph: '✨',
  },
  // 9. Psionic Will
  {
    id: 'foci_mind_dilation',
    name: 'Temporal Transmutation',
    category: 'psionic_transcend',
    modality: 'psionic',
    description: 'Dilates perception into slow-motion for 3 seconds while granting infinite Action Points.',
    actionPointCost: 50,
    valorPointCost: 50, // Overdrive ultimate
    cooldownSeconds: 15.0,
    damage: 0,
    staggerDamage: 0,
    rangeMeters: 0,
    iconGlyph: '👁️',
  },
];

export function createDefaultFrayLoadout(): FrayLoadout {
  return {
    id: 'loadout_vanguard_default',
    name: 'Vanguard Striker (9-Foci)',
    description: 'Balanced combat loadout built for deliberate melee pacing, parries, and elemental focus abilities.',
    insigniaId: 'insignia_ashen_warden',
    equippedFoci: [
      'foci_cleaving_strike',
      'foci_galvanic_burst',
      'foci_bulwark_parry',
      'foci_rampart_slam',
      'foci_pyre_lance',
      'foci_chain_tempest',
      'foci_void_vortex',
      'foci_astral_flare',
      'foci_mind_dilation',
    ],
    primaryWeaponName: 'Ashen Greatsword',
    armorClass: 'medium_warden',
    totalActionPoints: 100,
    apRegenPerSec: 24,
  };
}

export function createDefaultFrayGameCore(): FrayGameCoreBundle {
  return {
    version: '1.0.0',
    gameTitle: 'Fray: Ashen Chronicles',
    gameGenre: 'third_person_rpg',
    splashScreen: {
      studioName: 'Fray Studios',
      studioTagline: 'Forged in the Ashen Steppes',
      logoGlyph: '🔱',
      durationMs: 2500,
      fadeDurationMs: 600,
      backgroundColor: '#0c1017',
      accentColor: '#38bdf8',
      skipAllowed: true,
    },
    startMenu: {
      title: 'FRAY',
      subtitle: 'The Ashen Dominion',
      versionLabel: 'Build 0.434',
      backgroundType: '3d_scene',
      backdropReferenceId: 'mourne_ashen_steppes',
      menuItems: [
        { id: 'btn_new_game', label: 'Start Campaign', action: 'new_game', iconName: 'Play' },
        { id: 'btn_continue', label: 'Continue (Slot 1)', action: 'continue', iconName: 'RotateCcw' },
        { id: 'btn_armory', label: 'Foci Armory & Loadouts', action: 'foci_armory', iconName: 'Shield' },
        { id: 'btn_load', label: 'Load Journey', action: 'load_game', iconName: 'Folder' },
        { id: 'btn_settings', label: 'Settings', action: 'settings', iconName: 'Settings' },
        { id: 'btn_quit', label: 'Exit to Desktop', action: 'quit', iconName: 'X' },
      ],
      musicTrackId: 'theme_ashen_plains',
    },
    settings: {
      audio: {
        masterVolume: 85,
        musicVolume: 75,
        sfxVolume: 90,
        ambientVolume: 80,
        voiceVolume: 100,
      },
      display: {
        resolution: '1280x800',
        fullscreen: true,
        vsync: true,
        targetFrameRate: 90,
        fovDeg: 80,
        vrsEnabled: true,
      },
      gameplay: {
        difficulty: 'tactical',
        cameraSensitivity: 1.0,
        invertY: false,
        screenShake: true,
        floatingCombatText: true,
      },
    },
    playerController: {
      genreType: 'third_person_rpg',
      walkSpeed: 3.8,
      runSpeed: 6.5,
      dashSpeed: 12.0,
      jumpVelocity: 5.5,
      gravity: 18.0,
      combatLockOnRange: 22.0,
      dodgeStaminaCost: 22,
      lightAttackApCost: 15,
      heavyAttackApCost: 35,
      mouseSensitivity: 1.0,
      invertPitch: false,
    },
    activeLoadout: createDefaultFrayLoadout(),
    insignias: DEFAULT_FRAY_INSIGNIAS,
    fociCatalog: DEFAULT_FRAY_FOCI_CATALOG,
    savedSlots: [
      {
        slotId: 1,
        saveName: 'Chapter II: The Siphon Trench',
        timestamp: '2026-10-27 08:30',
        playtimeSeconds: 4320,
        currentMapOrScene: 'cavern_depths_02.terrain',
        playerLevel: 14,
        equippedInsigniaId: 'insignia_ashen_warden',
        activeFociLoadoutId: 'loadout_vanguard_default',
        valorPoints: 65,
        actionPoints: 100,
        progressionFlags: {
          gate_of_mourne_opened: true,
          ashen_golem_slain: true,
        },
      },
    ],
    cutscenes: [
      {
        id: 'cs_intro_awakening',
        name: 'The Awakening of the Ashen Vanguard',
        durationMs: 8500,
        letterboxEnabled: true,
        canSkip: true,
        keyframes: [
          {
            timeMs: 0,
            cameraPosition: [0, 8, 20],
            cameraTarget: [0, 1, 0],
            cameraFov: 60,
            dialogueSpeaker: 'Narrator',
            dialogueText: 'From the cold obsidian dust, the seal stirs once more...',
          },
          {
            timeMs: 4000,
            cameraPosition: [3, 2, 8],
            cameraTarget: [0, 1.2, 0],
            cameraFov: 45,
            dialogueSpeaker: 'Vanguard',
            dialogueText: 'The 9 Foci are silent... but the Insignia yet burns.',
          },
        ],
      },
    ],
    valorConfig: {
      current: 45,
      max: 100,
      gainOnParry: 20,
      gainOnStagger: 35,
      gainOnCombo: 8,
      decayRatePerSec: 2,
      overdriveThreshold: 75,
    },
    actionConfig: {
      current: 100,
      max: 100,
      regenPerSecond: 24,
      costs: {
        lightStrike: 15,
        heavyStrike: 35,
        dodgeRoll: 22,
        parryBlock: 12,
        sprintPerSec: 10,
      },
    },
  };
}
