/**
 * Mason AAA Modular 9-Slice & Ornamental Custom Border System
 * 
 * Provides:
 * - Corner and Edge modular customization (Single-rotated vs Individual 4-corner / 4-edge)
 * - Built-in AAA ornamental vector presets (Sovereign Gold, Cyber Tech, Gothic Runestone, Ashen Forged Iron, Sanctum Celestial)
 * - Custom developer image URL overrides
 */

export interface ModularBorderCorners {
  mode: 'single_rotated' | 'individual_custom';
  // Single image mode (auto-rotated for 4 corners: TL=0°, TR=90°, BR=180°, BL=270°)
  singleCornerImageUrl: string;
  // Individual 4-corner mode:
  topLeftImageUrl?: string;
  topRightImageUrl?: string;
  bottomRightImageUrl?: string;
  bottomLeftImageUrl?: string;
  cornerSizePx: number; // e.g. 24, 32, 48
  cornerOffsetPx: number; // e.g. -2 for slight outer overhang
}

export interface ModularBorderEdges {
  mode: 'single_rotated' | 'individual_custom';
  // Single edge mode (auto-rotated for 4 sides: Top=0°, Right=90°, Bottom=180°, Left=270°)
  singleEdgeImageUrl: string;
  // Individual 4-edge mode:
  topEdgeImageUrl?: string;
  rightEdgeImageUrl?: string;
  bottomEdgeImageUrl?: string;
  leftEdgeImageUrl?: string;
  edgeThicknessPx: number; // e.g. 6, 8, 12, 16
  repeatMode: 'repeat' | 'stretch' | 'round';
}

export interface GuiOrnamentalBorderConfig {
  enabled: boolean;
  presetId?: 'custom' | 'sovereign_gold' | 'cyber_brackets' | 'gothic_runestone' | 'ashen_forged_iron' | 'sanctum_celestial';
  corners: ModularBorderCorners;
  edges: ModularBorderEdges;
  tintColor?: string; // Optional CSS color filter / tint
  backgroundColor?: string;
  backgroundOpacity?: number; // 0 to 1
  glowColor?: string;
  glowBlurPx?: number;
}

// ==========================================
// VECTOR ASSET DATA URIs FOR AAA PRESETS
// ==========================================

// 1. Sovereign Gold Filigree Corner (Top-Left basis)
const SVG_GOLD_CORNER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <!-- Outer Gold Corner Frame -->
  <path d="M2 46V12C2 6.47715 6.47715 2 12 2H46" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
  <path d="M6 42V14C6 9.58172 9.58172 6 14 6H42" stroke="#d97706" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Ornate Acanthus / Filigree Curl -->
  <path d="M12 12C12 20 20 20 20 12C20 4 12 4 12 12Z" fill="#f59e0b" fill-opacity="0.3"/>
  <circle cx="12" cy="12" r="3.5" fill="#fbbf24"/>
  <path d="M2 14L14 2" stroke="#fbbf24" stroke-width="2"/>
  <path d="M2 24C8 24 10 18 10 14" stroke="#f59e0b" stroke-width="2"/>
  <path d="M24 2C24 8 18 10 14 10" stroke="#f59e0b" stroke-width="2"/>
  <polygon points="12,12 16,8 20,12 16,16" fill="#fbbf24"/>
  <circle cx="2" cy="46" r="2" fill="#f59e0b"/>
  <circle cx="46" cy="2" r="2" fill="#f59e0b"/>
</svg>
`)}`;

// 1. Sovereign Gold Repeating Edge (Top edge basis, 32x12)
const SVG_GOLD_EDGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="12" viewBox="0 0 32 12" fill="none">
  <line x1="0" y1="2" x2="32" y2="2" stroke="#f59e0b" stroke-width="2"/>
  <line x1="0" y1="6" x2="32" y2="6" stroke="#b45309" stroke-width="1" stroke-dasharray="2 2"/>
  <polygon points="16,0 20,4 16,8 12,4" fill="#fbbf24"/>
  <circle cx="4" cy="2" r="1.5" fill="#f59e0b"/>
  <circle cx="28" cy="2" r="1.5" fill="#f59e0b"/>
</svg>
`)}`;

// 2. Cyber Tech Brackets Corner (45° Chamfered HUD Bracket)
const SVG_CYBER_CORNER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <!-- 45-degree chamfered high-tech bracket -->
  <path d="M2 46V18L18 2H46" stroke="#06b6d4" stroke-width="3" stroke-linecap="square"/>
  <path d="M6 38V20L20 6H38" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="4 2"/>
  <!-- Target notch & micro-dots -->
  <polygon points="18,2 24,8 14,8" fill="#06b6d4"/>
  <rect x="2" y="32" width="5" height="3" fill="#22d3ee"/>
  <rect x="32" y="2" width="3" height="5" fill="#22d3ee"/>
  <circle cx="16" cy="16" r="2.5" fill="#06b6d4"/>
  <line x1="2" y1="46" x2="10" y2="46" stroke="#0891b2" stroke-width="3"/>
  <line x1="46" y1="2" x2="46" y2="10" stroke="#0891b2" stroke-width="3"/>
</svg>
`)}`;

// 2. Cyber Tech Repeating Edge (Segmented Rail)
const SVG_CYBER_EDGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="10" viewBox="0 0 32 10" fill="none">
  <line x1="0" y1="2" x2="32" y2="2" stroke="#06b6d4" stroke-width="2"/>
  <rect x="12" y="0" width="8" height="4" fill="#22d3ee"/>
  <line x1="4" y1="6" x2="28" y2="6" stroke="#0891b2" stroke-width="1" stroke-dasharray="3 3"/>
  <circle cx="2" cy="2" r="1.5" fill="#06b6d4"/>
</svg>
`)}`;

// 3. Gothic Runestone Corner (Carved Stone Medallion)
const SVG_GOTHIC_CORNER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <!-- Heavy carved knotwork corner -->
  <path d="M2 46V10C2 5.58 5.58 2 10 2H46" stroke="#a1a1aa" stroke-width="3"/>
  <path d="M8 40V14C8 10.69 10.69 8 14 8H40" stroke="#71717a" stroke-width="1.5"/>
  <!-- Central Runic Cross -->
  <path d="M12 4L16 16L4 12" stroke="#e4e4e7" stroke-width="2"/>
  <circle cx="14" cy="14" r="5" stroke="#a1a1aa" stroke-width="1.5" fill="#27272a"/>
  <path d="M14 9V19M9 14H19" stroke="#ef4444" stroke-width="1.5"/>
  <rect x="0" y="44" width="4" height="4" fill="#71717a"/>
  <rect x="44" y="0" width="4" height="4" fill="#71717a"/>
</svg>
`)}`;

// 3. Gothic Runestone Repeating Edge
const SVG_GOTHIC_EDGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="12" viewBox="0 0 32 12" fill="none">
  <line x1="0" y1="2" x2="32" y2="2" stroke="#a1a1aa" stroke-width="2"/>
  <path d="M0 6Q8 10 16 6Q24 2 32 6" stroke="#71717a" stroke-width="1.5" fill="none"/>
  <circle cx="16" cy="6" r="2" fill="#ef4444"/>
</svg>
`)}`;

// 4. Ashen Forged Iron Corner (Heavy Bolted Plate)
const SVG_IRON_CORNER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M2 46V8C2 4.69 4.69 2 8 2H46" stroke="#64748b" stroke-width="4"/>
  <path d="M8 44V12C8 9.79 9.79 8 12 8H44" stroke="#334155" stroke-width="2"/>
  <!-- Heavy industrial hex bolts -->
  <circle cx="12" cy="12" r="4.5" fill="#94a3b8" stroke="#1e293b" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="1.5" fill="#0f172a"/>
  <circle cx="4" cy="34" r="2.5" fill="#64748b"/>
  <circle cx="34" cy="4" r="2.5" fill="#64748b"/>
  <line x1="2" y1="2" x2="16" y2="16" stroke="#cbd5e1" stroke-width="1.5"/>
</svg>
`)}`;

// 4. Ashen Forged Iron Repeating Edge
const SVG_IRON_EDGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="12" viewBox="0 0 32 12" fill="none">
  <line x1="0" y1="2" x2="32" y2="2" stroke="#64748b" stroke-width="3"/>
  <circle cx="16" cy="6" r="2.5" fill="#94a3b8" stroke="#1e293b" stroke-width="1"/>
  <line x1="0" y1="8" x2="32" y2="8" stroke="#334155" stroke-width="1"/>
</svg>
`)}`;

// 5. Sanctum Celestial Corner (Winged Emerald Sunburst)
const SVG_CELESTIAL_CORNER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M2 46V14C2 7.37 7.37 2 14 2H46" stroke="#10b981" stroke-width="3"/>
  <path d="M8 40V16C8 11.58 11.58 8 16 8H40" stroke="#34d399" stroke-width="1.5"/>
  <!-- Winged Emerald Sunburst -->
  <polygon points="14,4 18,14 28,18 18,22 14,32 10,22 0,18 10,14" fill="#10b981" fill-opacity="0.3"/>
  <circle cx="14" cy="18" r="4" fill="#34d399" stroke="#065f46" stroke-width="1.5"/>
  <circle cx="14" cy="18" r="1.5" fill="#ecfdf5"/>
  <circle cx="2" cy="46" r="2" fill="#10b981"/>
  <circle cx="46" cy="2" r="2" fill="#10b981"/>
</svg>
`)}`;

// 5. Sanctum Celestial Repeating Edge
const SVG_CELESTIAL_EDGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="12" viewBox="0 0 32 12" fill="none">
  <line x1="0" y1="2" x2="32" y2="2" stroke="#10b981" stroke-width="2"/>
  <path d="M12 2L16 6L20 2" stroke="#34d399" stroke-width="1.5" fill="none"/>
  <circle cx="16" cy="8" r="1.5" fill="#10b981"/>
</svg>
`)}`;

// ==========================================
// PRESET BORDER DEFINITIONS
// ==========================================

export interface BorderPresetItem {
  id: string;
  name: string;
  description: string;
  tintColor: string;
  cornerSizePx: number;
  edgeThicknessPx: number;
  corners: ModularBorderCorners;
  edges: ModularBorderEdges;
}

export const AAA_BORDER_PRESETS: Record<string, BorderPresetItem> = {
  sovereign_gold: {
    id: 'sovereign_gold',
    name: 'Sovereign Gold Filigree',
    description: 'AAA baroque golden filigree corner curl with embossed jewel and beveled braided gold trim.',
    tintColor: '#f59e0b',
    cornerSizePx: 36,
    edgeThicknessPx: 10,
    corners: {
      mode: 'single_rotated',
      singleCornerImageUrl: SVG_GOLD_CORNER,
      cornerSizePx: 36,
      cornerOffsetPx: -2
    },
    edges: {
      mode: 'single_rotated',
      singleEdgeImageUrl: SVG_GOLD_EDGE,
      edgeThicknessPx: 10,
      repeatMode: 'repeat'
    }
  },
  cyber_brackets: {
    id: 'cyber_brackets',
    name: 'Cyber Tech Brackets',
    description: '45° angled sci-fi HUD bracket with targeting notches and neon cyan segmented rails.',
    tintColor: '#06b6d4',
    cornerSizePx: 32,
    edgeThicknessPx: 8,
    corners: {
      mode: 'single_rotated',
      singleCornerImageUrl: SVG_CYBER_CORNER,
      cornerSizePx: 32,
      cornerOffsetPx: -1
    },
    edges: {
      mode: 'single_rotated',
      singleEdgeImageUrl: SVG_CYBER_EDGE,
      edgeThicknessPx: 8,
      repeatMode: 'repeat'
    }
  },
  gothic_runestone: {
    id: 'gothic_runestone',
    name: 'Gothic Runestone',
    description: 'Carved weathered stone knotwork with crimson runic medallion and engraved stone borders.',
    tintColor: '#a1a1aa',
    cornerSizePx: 36,
    edgeThicknessPx: 10,
    corners: {
      mode: 'single_rotated',
      singleCornerImageUrl: SVG_GOTHIC_CORNER,
      cornerSizePx: 36,
      cornerOffsetPx: -2
    },
    edges: {
      mode: 'single_rotated',
      singleEdgeImageUrl: SVG_GOTHIC_EDGE,
      edgeThicknessPx: 10,
      repeatMode: 'repeat'
    }
  },
  ashen_forged_iron: {
    id: 'ashen_forged_iron',
    name: 'Ashen Forged Iron',
    description: 'Heavy industrial forged iron corner bracket with steel hex bolts and riveted plates.',
    tintColor: '#94a3b8',
    cornerSizePx: 34,
    edgeThicknessPx: 10,
    corners: {
      mode: 'single_rotated',
      singleCornerImageUrl: SVG_IRON_CORNER,
      cornerSizePx: 34,
      cornerOffsetPx: -2
    },
    edges: {
      mode: 'single_rotated',
      singleEdgeImageUrl: SVG_IRON_EDGE,
      edgeThicknessPx: 10,
      repeatMode: 'repeat'
    }
  },
  sanctum_celestial: {
    id: 'sanctum_celestial',
    name: 'Sanctum Celestial',
    description: 'Polished celestial sunburst corner emblem with luminous emerald facet and sacred geometric rails.',
    tintColor: '#10b981',
    cornerSizePx: 36,
    edgeThicknessPx: 10,
    corners: {
      mode: 'single_rotated',
      singleCornerImageUrl: SVG_CELESTIAL_CORNER,
      cornerSizePx: 36,
      cornerOffsetPx: -2
    },
    edges: {
      mode: 'single_rotated',
      singleEdgeImageUrl: SVG_CELESTIAL_EDGE,
      edgeThicknessPx: 10,
      repeatMode: 'repeat'
    }
  }
};

export const createDefaultModularBorderConfig = (presetKey: string = 'sovereign_gold'): GuiOrnamentalBorderConfig => {
  const preset = AAA_BORDER_PRESETS[presetKey] || AAA_BORDER_PRESETS.sovereign_gold;

  return {
    enabled: true,
    presetId: preset.id as any,
    corners: {
      mode: preset.corners.mode,
      singleCornerImageUrl: preset.corners.singleCornerImageUrl,
      topLeftImageUrl: preset.corners.singleCornerImageUrl,
      topRightImageUrl: preset.corners.singleCornerImageUrl,
      bottomRightImageUrl: preset.corners.singleCornerImageUrl,
      bottomLeftImageUrl: preset.corners.singleCornerImageUrl,
      cornerSizePx: preset.cornerSizePx,
      cornerOffsetPx: preset.corners.cornerOffsetPx
    },
    edges: {
      mode: preset.edges.mode,
      singleEdgeImageUrl: preset.edges.singleEdgeImageUrl,
      topEdgeImageUrl: preset.edges.singleEdgeImageUrl,
      rightEdgeImageUrl: preset.edges.singleEdgeImageUrl,
      bottomEdgeImageUrl: preset.edges.singleEdgeImageUrl,
      leftEdgeImageUrl: preset.edges.singleEdgeImageUrl,
      edgeThicknessPx: preset.edgeThicknessPx,
      repeatMode: 'repeat'
    },
    tintColor: preset.tintColor,
    backgroundColor: '#0a0a0d',
    backgroundOpacity: 0.85,
    glowColor: `${preset.tintColor}40`,
    glowBlurPx: 16
  };
};
