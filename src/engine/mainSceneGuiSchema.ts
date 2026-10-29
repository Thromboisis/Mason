/**
 * Mason Main Scene GUI Architecture Schema & Presets
 * 
 * Default GUIs:
 * 1. Splash Screen
 * 2. Start Menu
 * 3. Settings Menu
 * 4. In game HUD
 * 5. In game pause menu
 * 6. Save/Load menu
 */

import {
  GuiOrnamentalBorderConfig,
  createDefaultModularBorderConfig,
  AAA_BORDER_PRESETS
} from './ornamentalBorderPresets';

export * from './ornamentalBorderPresets';

export type DefaultGuiId =
  | 'splash_screen'
  | 'start_menu'
  | 'settings_menu'
  | 'in_game_hud'
  | 'in_game_pause_menu'
  | 'save_load_menu';

export type GuiWidgetType =
  | 'button'
  | 'text'
  | 'image'
  | 'container'
  | 'slider'
  | 'hud_gauge'
  | 'save_slot_card';

export type GuiActionType =
  | 'start_game'        // Transitions to 3D world space and mounts initial/active sub-scene
  | 'open_gui'          // Navigates to another GUI screen (targetGuiId)
  | 'resume_game'       // Closes in-game pause menu and returns to in-game HUD
  | 'open_pause_menu'   // Opens in-game pause menu
  | 'save_slot'         // Saves game progress to specified slot
  | 'load_slot'         // Loads game progress and mounts associated sub-scene
  | 'quit_to_title'     // Returns to Start Menu
  | 'toggle_audio'      // Mutes or unmutes global master audio
  | 'change_setting'    // Updates an engine/display/gameplay setting
  | 'custom_action';    // Custom script/logic trigger

export interface GuiButtonAction {
  type: GuiActionType;
  targetGuiId?: DefaultGuiId;
  targetSubSceneId?: string;
  slotNumber?: number;
  settingKey?: string;
  label?: string;
}

export interface GuiWidget {
  id: string;
  type: GuiWidgetType;
  name: string;
  label?: string;
  secondaryText?: string;
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  fontFamily?: 'cinematic_serif' | 'modern_sans' | 'tactical_mono' | 'cyber_display';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  // Positioning on the 24x16 Draggable Grid
  gridX: number; // 0 to 23
  gridY: number; // 0 to 15
  gridWidth: number; // 1 to 24 columns
  gridHeight: number; // 1 to 16 rows
  zIndex?: number;
  // Fallback Alignment & Positioning within GUI Layout
  positionMode?: 'grid' | 'auto' | 'absolute';
  alignment?: 'center' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'bottom_center' | 'center_column';
  // AAA Custom Modular Ornamental Border (Corners & Edges)
  customBorder?: GuiOrnamentalBorderConfig;
  // Image properties
  imageUrl?: string;
  imageAlt?: string;
  imageFit?: 'contain' | 'cover';
  widthPx?: number;
  heightPx?: number;
  // Button & Action properties
  action?: GuiButtonAction;
  buttonVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  icon?: string; // lucide icon identifier e.g. "Play", "Settings", "Save", "RotateCcw", etc.
  // Slider properties
  sliderConfig?: {
    settingKey: string;
    label: string;
    min: number;
    max: number;
    value: number;
    step: number;
    unit?: string;
  };
  // HUD Gauge properties
  hudGaugeConfig?: {
    gaugeType: 'health' | 'ap' | 'valor' | 'foci';
    label: string;
    currentValue: number;
    maxValue: number;
    barColor?: string;
    subBarColor?: string;
  };
  // Save Slot Card properties
  saveSlotConfig?: {
    slotNumber: number;
    slotTitle: string;
    subSceneName: string;
    playtime: string;
    timestamp: string;
    valorPoints: number;
    actionPoints: number;
    isEmpty: boolean;
  };
  // Container properties
  childrenIds?: string[];
}

export interface GuiScreenDefinition {
  id: DefaultGuiId;
  name: string;
  subtitle: string;
  description: string;
  iconName: string;
  layoutType: 'centered_card' | 'fullscreen_cinematic' | 'hud_overlay' | 'dialog_modal' | 'column_stack';
  backdropType: 'dark_vignette' | 'subscene_preview' | 'solid_color' | 'gradient' | 'transparent';
  backdropColor?: string;
  widgets: GuiWidget[];
}

export interface GuiThemeConfig {
  id: string;
  name: string;
  description: string;
  // Colors
  primaryAccent: string;      // Buttons, highlighted borders, active states
  primaryAccentHover: string; // Hover states
  secondaryAccent: string;    // Secondary tags, sub-actions
  backgroundColor: string;    // Screen backdrop / canvas tone
  cardBackground: string;     // Panel / modal surface
  textColor: string;          // Primary text
  mutedTextColor: string;     // Subtitles, hints, metadata
  borderColor: string;        // Button & container border
  borderWidthPx: number;      // 0, 1, 2, 3
  borderRadiusPx: number;     // 0 = tactical/sharp, 6 = sleek, 12 = rounded, 24 = smooth
  borderGlow: boolean;        // Luminous border shadow
  borderGlowColor?: string;
  // Typography
  fontFamily: 'cinematic_serif' | 'modern_sans' | 'tactical_mono' | 'cyber_display';
  // Button Styling
  buttonVariantStyle: 'solid_raised' | 'glow_beveled' | 'hollow_outline' | 'flat_minimal';
  buttonBorderRadiusPx: number;
  buttonPaddingY: number;     // e.g. 10
  buttonPaddingX: number;     // e.g. 24
}

// ==========================================
// PRESET THEMES
// ==========================================

export const PRESET_GUI_THEMES: GuiThemeConfig[] = [
  {
    id: 'theme_fray_sovereign',
    name: 'Fray Sovereign (Obsidian & Amber Gold)',
    description: 'Regal obsidian backdrop with warm amber gold borders, beveled buttons, and subtle warm luminescence.',
    primaryAccent: '#f59e0b',
    primaryAccentHover: '#fbbf24',
    secondaryAccent: '#d97706',
    backgroundColor: '#0a0a0c',
    cardBackground: '#141419',
    textColor: '#fafaf9',
    mutedTextColor: '#a8a29e',
    borderColor: '#78350f',
    borderWidthPx: 1.5,
    borderRadiusPx: 12,
    borderGlow: true,
    borderGlowColor: 'rgba(245, 158, 11, 0.25)',
    fontFamily: 'cinematic_serif',
    buttonVariantStyle: 'glow_beveled',
    buttonBorderRadiusPx: 10,
    buttonPaddingY: 10,
    buttonPaddingX: 24
  },
  {
    id: 'theme_void_ether',
    name: 'Ether Void (Deep Midnight & Neon Cyan)',
    description: 'Futuristic high-contrast sci-fi aesthetic with electric cyan neon accents and razor-sharp borders.',
    primaryAccent: '#06b6d4',
    primaryAccentHover: '#22d3ee',
    secondaryAccent: '#0891b2',
    backgroundColor: '#030712',
    cardBackground: '#0b1329',
    textColor: '#f0fdfa',
    mutedTextColor: '#94a3b8',
    borderColor: '#0e7490',
    borderWidthPx: 2,
    borderRadiusPx: 4,
    borderGlow: true,
    borderGlowColor: 'rgba(6, 182, 212, 0.35)',
    fontFamily: 'cyber_display',
    buttonVariantStyle: 'solid_raised',
    buttonBorderRadiusPx: 4,
    buttonPaddingY: 10,
    buttonPaddingX: 26
  },
  {
    id: 'theme_ashen_crucible',
    name: 'Ashen Crucible (Charcoal & Crimson)',
    description: 'Dark battle-worn graphite palette with blazing crimson borders and tactical utilitarian buttons.',
    primaryAccent: '#ef4444',
    primaryAccentHover: '#f87171',
    secondaryAccent: '#b91c1c',
    backgroundColor: '#0f0f10',
    cardBackground: '#1a1a1d',
    textColor: '#f4f4f5',
    mutedTextColor: '#a1a1aa',
    borderColor: '#7f1d1d',
    borderWidthPx: 2,
    borderRadiusPx: 2,
    borderGlow: true,
    borderGlowColor: 'rgba(239, 68, 68, 0.25)',
    fontFamily: 'tactical_mono',
    buttonVariantStyle: 'solid_raised',
    buttonBorderRadiusPx: 2,
    buttonPaddingY: 11,
    buttonPaddingX: 22
  },
  {
    id: 'theme_sanctum_jade',
    name: 'Sanctum Jade (Slate & Luminous Emerald)',
    description: 'Balanced ancient sanctum theme with deep slate backdrop, polished jade emerald accents, and rounded contours.',
    primaryAccent: '#10b981',
    primaryAccentHover: '#34d399',
    secondaryAccent: '#059669',
    backgroundColor: '#06100d',
    cardBackground: '#0c1d18',
    textColor: '#ecfdf5',
    mutedTextColor: '#6ee7b7',
    borderColor: '#047857',
    borderWidthPx: 1,
    borderRadiusPx: 16,
    borderGlow: false,
    borderGlowColor: 'rgba(16, 185, 129, 0.2)',
    fontFamily: 'modern_sans',
    buttonVariantStyle: 'hollow_outline',
    buttonBorderRadiusPx: 12,
    buttonPaddingY: 10,
    buttonPaddingX: 24
  },
  {
    id: 'theme_minimal_monochrome',
    name: 'Minimal Platinum (Monochrome & Pure White)',
    description: 'Clean high-readability architectural styling with pure white accents and subtle slate hairline borders.',
    primaryAccent: '#f4f4f5',
    primaryAccentHover: '#ffffff',
    secondaryAccent: '#71717a',
    backgroundColor: '#09090b',
    cardBackground: '#18181b',
    textColor: '#ffffff',
    mutedTextColor: '#71717a',
    borderColor: '#27272a',
    borderWidthPx: 1,
    borderRadiusPx: 8,
    borderGlow: false,
    fontFamily: 'modern_sans',
    buttonVariantStyle: 'flat_minimal',
    buttonBorderRadiusPx: 8,
    buttonPaddingY: 9,
    buttonPaddingX: 20
  }
];

// ==========================================
// DEFAULT GUIs FACTORY (WITH 24x16 GRID COORDS)
// ==========================================

export const createDefaultGuiScreens = (): GuiScreenDefinition[] => [
  // 1. Splash Screen
  {
    id: 'splash_screen',
    name: 'Splash Screen',
    subtitle: 'Brand logo & pre-game introduction sequence',
    description: 'Initial screen displayed when launching the game. Shows publisher/studio logo, cinematic title card, and prompts user to proceed.',
    iconName: 'Sparkles',
    layoutType: 'fullscreen_cinematic',
    backdropType: 'dark_vignette',
    backdropColor: '#050507',
    widgets: [
      {
        id: 'splash_logo',
        type: 'image',
        name: 'Studio Crest',
        gridX: 10,
        gridY: 2,
        gridWidth: 4,
        gridHeight: 3,
        imageUrl: '',
        imageAlt: 'Mason Fray Universe Emblem',
        alignment: 'center',
        customBorder: createDefaultModularBorderConfig('sovereign_gold')
      },
      {
        id: 'splash_title',
        type: 'text',
        name: 'Game Title',
        gridX: 3,
        gridY: 6,
        gridWidth: 18,
        gridHeight: 2,
        label: 'CHRONICLES OF THE ASHEN VOID',
        fontSize: '3xl',
        fontWeight: 'black',
        fontFamily: 'cinematic_serif',
        textAlign: 'center',
        alignment: 'center'
      },
      {
        id: 'splash_subtitle',
        type: 'text',
        name: 'Engine Tagline',
        gridX: 4,
        gridY: 8,
        gridWidth: 16,
        gridHeight: 1,
        label: 'A Fray Universe Saga • Powered by Mason Engine',
        fontSize: 'sm',
        fontWeight: 'medium',
        fontFamily: 'modern_sans',
        textAlign: 'center',
        alignment: 'center'
      },
      {
        id: 'splash_proceed_btn',
        type: 'button',
        name: 'Proceed Button',
        gridX: 7,
        gridY: 11,
        gridWidth: 10,
        gridHeight: 2,
        label: 'PRESS ANY KEY OR CLICK TO BEGIN',
        secondaryText: 'Loads the Start Menu',
        buttonVariant: 'accent',
        icon: 'ArrowRight',
        alignment: 'center',
        customBorder: createDefaultModularBorderConfig('sovereign_gold'),
        action: {
          type: 'open_gui',
          targetGuiId: 'start_menu',
          label: 'Continue to Start Menu'
        }
      }
    ]
  },

  // 2. Start Menu
  {
    id: 'start_menu',
    name: 'Start Menu',
    subtitle: 'Primary title screen with campaign and system options',
    description: 'Main menu with title banner, New Game, Load Game, Settings, and Quit options, connecting directly to Sub-Scenes.',
    iconName: 'Play',
    layoutType: 'centered_card',
    backdropType: 'gradient',
    backdropColor: '#0a0a0f',
    widgets: [
      {
        id: 'start_title_banner',
        type: 'text',
        name: 'Title Banner',
        gridX: 4,
        gridY: 1,
        gridWidth: 16,
        gridHeight: 2,
        label: 'CHRONICLES OF THE ASHEN VOID',
        fontSize: '3xl',
        fontWeight: 'black',
        fontFamily: 'cinematic_serif',
        textAlign: 'center',
        alignment: 'center',
        customBorder: createDefaultModularBorderConfig('sovereign_gold')
      },
      {
        id: 'start_version_text',
        type: 'text',
        name: 'Version Label',
        gridX: 6,
        gridY: 3,
        gridWidth: 12,
        gridHeight: 1,
        label: 'Mason Core v0.441 • Build Stable',
        fontSize: 'xs',
        fontWeight: 'normal',
        fontFamily: 'tactical_mono',
        textAlign: 'center',
        alignment: 'center'
      },
      {
        id: 'start_btn_new_game',
        type: 'button',
        name: 'New Game Button',
        gridX: 7,
        gridY: 5,
        gridWidth: 10,
        gridHeight: 2,
        label: 'NEW GAME',
        secondaryText: 'Deploy into Ashen Outpost sub-scene',
        buttonVariant: 'primary',
        icon: 'Play',
        alignment: 'center_column',
        customBorder: createDefaultModularBorderConfig('sovereign_gold'),
        action: {
          type: 'start_game',
          targetSubSceneId: 'subscene_ashen_outpost',
          label: 'Start New Game'
        }
      },
      {
        id: 'start_btn_load_game',
        type: 'button',
        name: 'Load Game Button',
        gridX: 7,
        gridY: 7,
        gridWidth: 10,
        gridHeight: 2,
        label: 'LOAD GAME',
        secondaryText: 'Resume from saved slot',
        buttonVariant: 'secondary',
        icon: 'HardDrive',
        alignment: 'center_column',
        customBorder: createDefaultModularBorderConfig('sovereign_gold'),
        action: {
          type: 'open_gui',
          targetGuiId: 'save_load_menu',
          label: 'Open Save/Load Menu'
        }
      },
      {
        id: 'start_btn_settings',
        type: 'button',
        name: 'Settings Button',
        gridX: 7,
        gridY: 9,
        gridWidth: 10,
        gridHeight: 2,
        label: 'SETTINGS',
        secondaryText: 'Audio, graphics & controls',
        buttonVariant: 'secondary',
        icon: 'Sliders',
        alignment: 'center_column',
        customBorder: createDefaultModularBorderConfig('sovereign_gold'),
        action: {
          type: 'open_gui',
          targetGuiId: 'settings_menu',
          label: 'Open Settings'
        }
      },
      {
        id: 'start_btn_quit',
        type: 'button',
        name: 'Quit Button',
        gridX: 7,
        gridY: 11,
        gridWidth: 10,
        gridHeight: 2,
        label: 'RETURN TO TITLE',
        secondaryText: 'Reset session to splash screen',
        buttonVariant: 'outline',
        icon: 'RotateCcw',
        alignment: 'center_column',
        customBorder: createDefaultModularBorderConfig('sovereign_gold'),
        action: {
          type: 'open_gui',
          targetGuiId: 'splash_screen',
          label: 'Back to Splash'
        }
      }
    ]
  },

  // 3. Settings Menu
  {
    id: 'settings_menu',
    name: 'Settings Menu',
    subtitle: 'System audio, display, and gameplay calibration',
    description: 'Configures master volume, music, sound effects, display resolution, graphics quality, and key bindings with save/apply actions.',
    iconName: 'Sliders',
    layoutType: 'dialog_modal',
    backdropType: 'subscene_preview',
    backdropColor: '#0a0a0d',
    widgets: [
      {
        id: 'settings_header_title',
        type: 'text',
        name: 'Settings Header',
        gridX: 4,
        gridY: 1,
        gridWidth: 16,
        gridHeight: 2,
        label: 'SYSTEM CONFIGURATION',
        fontSize: '2xl',
        fontWeight: 'bold',
        fontFamily: 'cinematic_serif',
        textAlign: 'center',
        customBorder: createDefaultModularBorderConfig('cyber_brackets')
      },
      {
        id: 'settings_slider_master_vol',
        type: 'slider',
        name: 'Master Volume Slider',
        gridX: 4,
        gridY: 3,
        gridWidth: 16,
        gridHeight: 2,
        sliderConfig: {
          settingKey: 'master_volume',
          label: 'Master Volume',
          min: 0,
          max: 100,
          value: 80,
          step: 5,
          unit: '%'
        }
      },
      {
        id: 'settings_slider_music_vol',
        type: 'slider',
        name: 'Music Volume Slider',
        gridX: 4,
        gridY: 5,
        gridWidth: 16,
        gridHeight: 2,
        sliderConfig: {
          settingKey: 'music_volume',
          label: 'Music Volume',
          min: 0,
          max: 100,
          value: 70,
          step: 5,
          unit: '%'
        }
      },
      {
        id: 'settings_slider_sfx_vol',
        type: 'slider',
        name: 'SFX Volume Slider',
        gridX: 4,
        gridY: 7,
        gridWidth: 16,
        gridHeight: 2,
        sliderConfig: {
          settingKey: 'sfx_volume',
          label: 'Sound Effects Volume',
          min: 0,
          max: 100,
          value: 90,
          step: 5,
          unit: '%'
        }
      },
      {
        id: 'settings_slider_gamma',
        type: 'slider',
        name: 'Display Brightness Slider',
        gridX: 4,
        gridY: 9,
        gridWidth: 16,
        gridHeight: 2,
        sliderConfig: {
          settingKey: 'display_brightness',
          label: 'Display Brightness / Gamma',
          min: 50,
          max: 150,
          value: 100,
          step: 5,
          unit: '%'
        }
      },
      {
        id: 'settings_btn_apply_back',
        type: 'button',
        name: 'Apply & Close Button',
        gridX: 8,
        gridY: 12,
        gridWidth: 8,
        gridHeight: 2,
        label: 'APPLY & CLOSE',
        secondaryText: 'Save preferences and return',
        buttonVariant: 'primary',
        icon: 'CheckCircle2',
        alignment: 'center',
        customBorder: createDefaultModularBorderConfig('cyber_brackets'),
        action: {
          type: 'open_gui',
          targetGuiId: 'start_menu',
          label: 'Close Settings'
        }
      }
    ]
  },

  // 4. In game HUD
  {
    id: 'in_game_hud',
    name: 'In game HUD',
    subtitle: 'Persistent real-time combat & vitals overlay',
    description: 'Heads-Up Display mounted over the active Sub-Scene: Player Health, Action Points (AP), Valor Overdrive meter, and 9-Foci radial stance bar.',
    iconName: 'Shield',
    layoutType: 'hud_overlay',
    backdropType: 'transparent',
    widgets: [
      {
        id: 'hud_health_gauge',
        type: 'hud_gauge',
        name: 'Vitality Health Bar',
        gridX: 1,
        gridY: 1,
        gridWidth: 7,
        gridHeight: 2,
        hudGaugeConfig: {
          gaugeType: 'health',
          label: 'VITALITY (HP)',
          currentValue: 850,
          maxValue: 1000,
          barColor: '#ef4444',
          subBarColor: '#7f1d1d'
        },
        customBorder: createDefaultModularBorderConfig('cyber_brackets')
      },
      {
        id: 'hud_ap_gauge',
        type: 'hud_gauge',
        name: 'Action Points Gauge',
        gridX: 1,
        gridY: 3,
        gridWidth: 7,
        gridHeight: 2,
        hudGaugeConfig: {
          gaugeType: 'ap',
          label: 'ACTION POINTS (AP)',
          currentValue: 80,
          maxValue: 100,
          barColor: '#06b6d4',
          subBarColor: '#0891b2'
        },
        customBorder: createDefaultModularBorderConfig('cyber_brackets')
      },
      {
        id: 'hud_btn_pause',
        type: 'button',
        name: 'Pause Trigger Button',
        gridX: 19,
        gridY: 1,
        gridWidth: 4,
        gridHeight: 2,
        label: 'PAUSE (ESC)',
        buttonVariant: 'outline',
        icon: 'Sliders',
        customBorder: createDefaultModularBorderConfig('cyber_brackets'),
        action: {
          type: 'open_pause_menu',
          targetGuiId: 'in_game_pause_menu',
          label: 'Pause Game'
        }
      },
      {
        id: 'hud_foci_matrix',
        type: 'hud_gauge',
        name: '9-Foci Stance Radial',
        gridX: 1,
        gridY: 10,
        gridWidth: 8,
        gridHeight: 5,
        hudGaugeConfig: {
          gaugeType: 'foci',
          label: 'FRAY STANCE MATRIX (9 FOCI)',
          currentValue: 3,
          maxValue: 9,
          barColor: '#a855f7',
          subBarColor: '#581c87'
        },
        customBorder: createDefaultModularBorderConfig('cyber_brackets')
      },
      {
        id: 'hud_valor_gauge',
        type: 'hud_gauge',
        name: 'Valor Overdrive Gauge',
        gridX: 10,
        gridY: 12,
        gridWidth: 8,
        gridHeight: 3,
        hudGaugeConfig: {
          gaugeType: 'valor',
          label: 'VALOR MOMENTUM',
          currentValue: 65,
          maxValue: 100,
          barColor: '#f59e0b',
          subBarColor: '#b45309'
        },
        customBorder: createDefaultModularBorderConfig('sovereign_gold')
      }
    ]
  },

  // 5. In game pause menu
  {
    id: 'in_game_pause_menu',
    name: 'In game pause menu',
    subtitle: 'Tactical pause overlay with loadout & save options',
    description: 'Suspends the sub-scene action, displaying Resume, Stance Loadout, Settings, Save Game, and Return to Title options.',
    iconName: 'Sliders',
    layoutType: 'dialog_modal',
    backdropType: 'subscene_preview',
    backdropColor: 'rgba(10, 10, 15, 0.85)',
    widgets: [
      {
        id: 'pause_title',
        type: 'text',
        name: 'Pause Title',
        gridX: 7,
        gridY: 2,
        gridWidth: 10,
        gridHeight: 2,
        label: 'GAME PAUSED',
        fontSize: '3xl',
        fontWeight: 'bold',
        fontFamily: 'cinematic_serif',
        textAlign: 'center',
        customBorder: createDefaultModularBorderConfig('gothic_runestone')
      },
      {
        id: 'pause_subscene_indicator',
        type: 'text',
        name: 'Location Status',
        gridX: 7,
        gridY: 4,
        gridWidth: 10,
        gridHeight: 1,
        label: 'Realm: Ashen Outpost • Active Sub-Scene 01',
        fontSize: 'xs',
        fontWeight: 'normal',
        fontFamily: 'tactical_mono',
        textAlign: 'center'
      },
      {
        id: 'pause_btn_resume',
        type: 'button',
        name: 'Resume Button',
        gridX: 7,
        gridY: 5,
        gridWidth: 10,
        gridHeight: 2,
        label: 'RESUME GAME',
        secondaryText: 'Unpause and return to active combat',
        buttonVariant: 'primary',
        icon: 'Play',
        customBorder: createDefaultModularBorderConfig('gothic_runestone'),
        action: {
          type: 'resume_game',
          targetGuiId: 'in_game_hud',
          label: 'Resume Game'
        }
      },
      {
        id: 'pause_btn_save',
        type: 'button',
        name: 'Save Progress Button',
        gridX: 7,
        gridY: 7,
        gridWidth: 10,
        gridHeight: 2,
        label: 'SAVE GAME',
        secondaryText: 'Commit current subscene & loadout',
        buttonVariant: 'secondary',
        icon: 'HardDrive',
        customBorder: createDefaultModularBorderConfig('gothic_runestone'),
        action: {
          type: 'open_gui',
          targetGuiId: 'save_load_menu',
          label: 'Open Save Menu'
        }
      },
      {
        id: 'pause_btn_settings',
        type: 'button',
        name: 'Settings Button',
        gridX: 7,
        gridY: 9,
        gridWidth: 10,
        gridHeight: 2,
        label: 'SETTINGS',
        secondaryText: 'Calibrate audio and controls',
        buttonVariant: 'secondary',
        icon: 'Sliders',
        customBorder: createDefaultModularBorderConfig('gothic_runestone'),
        action: {
          type: 'open_gui',
          targetGuiId: 'settings_menu',
          label: 'Open Settings'
        }
      },
      {
        id: 'pause_btn_quit_title',
        type: 'button',
        name: 'Quit to Title Button',
        gridX: 7,
        gridY: 11,
        gridWidth: 10,
        gridHeight: 2,
        label: 'QUIT TO MAIN MENU',
        secondaryText: 'Unload active sub-scene',
        buttonVariant: 'danger',
        icon: 'RotateCcw',
        customBorder: createDefaultModularBorderConfig('gothic_runestone'),
        action: {
          type: 'quit_to_title',
          targetGuiId: 'start_menu',
          label: 'Quit to Main Menu'
        }
      }
    ]
  },

  // 6. Save/Load Menu
  {
    id: 'save_load_menu',
    name: 'save/load menu',
    subtitle: 'Session persistence and cloud/local save slot browser',
    description: 'Manages game state slots across all Sub-Scenes, recording playtime, level, valor points, and character loadouts.',
    iconName: 'HardDrive',
    layoutType: 'dialog_modal',
    backdropType: 'subscene_preview',
    backdropColor: '#0a0a0d',
    widgets: [
      {
        id: 'save_menu_header',
        type: 'text',
        name: 'Header Title',
        gridX: 4,
        gridY: 1,
        gridWidth: 16,
        gridHeight: 2,
        label: 'SAVE / LOAD GAME SLOTS',
        fontSize: '2xl',
        fontWeight: 'bold',
        fontFamily: 'cinematic_serif',
        textAlign: 'center',
        customBorder: createDefaultModularBorderConfig('ashen_forged_iron')
      },
      {
        id: 'save_slot_01',
        type: 'save_slot_card',
        name: 'Slot 1: Ashen Outpost',
        gridX: 4,
        gridY: 3,
        gridWidth: 16,
        gridHeight: 3,
        customBorder: createDefaultModularBorderConfig('ashen_forged_iron'),
        saveSlotConfig: {
          slotNumber: 1,
          slotTitle: 'Slot 01: Ashen Frontier',
          subSceneName: 'Ashen Outpost',
          playtime: '04h 22m',
          timestamp: 'Today, 14:32',
          valorPoints: 65,
          actionPoints: 100,
          isEmpty: false
        }
      },
      {
        id: 'save_slot_02',
        type: 'save_slot_card',
        name: 'Slot 2: Ruined Sanctum',
        gridX: 4,
        gridY: 6,
        gridWidth: 16,
        gridHeight: 3,
        customBorder: createDefaultModularBorderConfig('ashen_forged_iron'),
        saveSlotConfig: {
          slotNumber: 2,
          slotTitle: 'Slot 02: High Sanctum',
          subSceneName: 'Ruined Sanctum',
          playtime: '12h 48m',
          timestamp: 'Yesterday, 19:10',
          valorPoints: 92,
          actionPoints: 100,
          isEmpty: false
        }
      },
      {
        id: 'save_slot_03',
        type: 'save_slot_card',
        name: 'Slot 3: Empty Slot',
        gridX: 4,
        gridY: 9,
        gridWidth: 16,
        gridHeight: 3,
        customBorder: createDefaultModularBorderConfig('ashen_forged_iron'),
        saveSlotConfig: {
          slotNumber: 3,
          slotTitle: 'Slot 03: [Empty Save Slot]',
          subSceneName: 'Uncharted Realm',
          playtime: '00h 00m',
          timestamp: '—',
          valorPoints: 0,
          actionPoints: 0,
          isEmpty: true
        }
      },
      {
        id: 'save_btn_back',
        type: 'button',
        name: 'Back to Menu Button',
        gridX: 9,
        gridY: 13,
        gridWidth: 6,
        gridHeight: 2,
        label: 'RETURN TO MENU',
        buttonVariant: 'outline',
        icon: 'ArrowRight',
        alignment: 'center',
        customBorder: createDefaultModularBorderConfig('ashen_forged_iron'),
        action: {
          type: 'open_gui',
          targetGuiId: 'start_menu',
          label: 'Back to Menu'
        }
      }
    ]
  }
];
