import React from 'react';
import { MASON_VERSION_DISPLAY } from '../version';

/**
 * Computes an absolute, environment-agnostic URL for mini-app HTML module entrypoints.
 * Handles subpath deployments (GitHub Pages), PWA relative paths, and local dev servers.
 */
export function getModuleUrl(subpath: string): string {
  const cleanSubpath = subpath.replace(/^\.\//, '').replace(/^\//, '');

  const envBase = (import.meta as any).env?.BASE_URL;
  if (envBase && envBase !== './' && envBase !== '/') {
    const formattedBase = envBase.endsWith('/') ? envBase : `${envBase}/`;
    return `${formattedBase}${cleanSubpath}`;
  }

  if (typeof window !== 'undefined' && window.location) {
    let pathname = window.location.pathname;
    if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
      pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    }
    if (!pathname.endsWith('/')) {
      pathname += '/';
    }
    return `${window.location.origin}${pathname}${cleanSubpath}`;
  }

  return `./${cleanSubpath}`;
}

export interface MasonModuleDefinition {
  id: string;
  name: string;
  tagline: string;
  category: 'Core Architecture';
  subfolder: string; // e.g. "modules/mainscene"
  entryHtml: string; // e.g. "./modules/mainscene/index.html"
  associatedFolder: string; // e.g. "scenes"
  associatedExtension: string; // e.g. ".mainscene"
  iconName: 'Shield' | 'Layers' | 'Box';
  accentColor: string; // amber, cyan, purple
  description: string;
  features: string[];
  version: string;
}

export const MASON_MODULES: MasonModuleDefinition[] = [
  {
    id: 'main_scene',
    name: 'Main Scene',
    tagline: 'Persistent root container: Splash, Menus, Saves, HUD, empty 3D space & Sub-scene loader',
    category: 'Core Architecture',
    subfolder: 'modules/mainscene',
    entryHtml: './modules/mainscene/index.html',
    associatedFolder: 'scenes',
    associatedExtension: '.mainscene',
    iconName: 'Shield',
    accentColor: 'amber',
    description: 'The persistent root scene that lives across the entire session. Manages splash screens, start menus, system settings, save/load slots, persistent HUD & Fray UI, the empty 3D world coordinate space (0,0,0), and the Sub-Scene Orchestrator which enforces strict single-sub-scene continuity. Does not manage physics, gravity rules, or lighting.',
    features: [
      'Universal Game Pipeline: Splash screens, Start Menu, Settings & Save/Load slot registry',
      'Persistent HUD & Fray UI: Health/AP gauges, 9-Foci radial stance bar, and Valor Overdrive meter',
      'Empty 3D Coordinate Space: Pure Cartesian spatial frame (0,0,0) with zero physics or gravity simulation overhead',
      'Solid Early-Z Pipeline: Polygonal rendering optimization flag for 100% solid meshes with zero alpha overdraw',
      'Sub-Scene Orchestrator: Live mount/unload switcher enforcing strictly 1 active sub-scene at a time',
      'Session Continuity: Preserves player loadouts, HUD state, audio, and save state without tear-down overhead'
    ],
    version: MASON_VERSION_DISPLAY
  },
  {
    id: 'sub_scenes',
    name: 'Sub-Scenes',
    tagline: 'Isolated gameplay spaces holding placed 3D objects, lights, shadows, skyboxes & physics',
    category: 'Core Architecture',
    subfolder: 'modules/subscenes',
    entryHtml: './modules/subscenes/index.html',
    associatedFolder: 'scenes',
    associatedExtension: '.subscene',
    iconName: 'Layers',
    accentColor: 'cyan',
    description: 'Containers for actual gameplay levels, realms, and rooms. Strictly 1 sub-scene is loaded into the Main Scene at runtime. Directly manages all environmental light sources (Sun/Moon directional vector, hemispheric ambient bounce, volumetric fog), shadow sources (cascaded shadow maps 512-4096px, bias, contact shadows), skyboxes (celestial dome presets, tint, exposure), physics & gravity rules, and 3D placed object instances.',
    features: [
      'Sub-Scene Managed Physics & Gravity: Local gravity vectors (Earth, Moon, Void, Zero-G) and 60Hz fixed simulation',
      'Sub-Scene Managed Lighting: Directional Sun/Moon with 3D pitch/yaw vectors, ambient hemispheric lighting & volumetric fog',
      'Sub-Scene Managed Shadows: Cascaded shadow map resolution (512-4096px), shadow distance, bias & contact shadows',
      'Sub-Scene Managed Skybox: Atmospheric sky dome presets (Ashen Dusk, Void Horizon, Overworld Noon, etc.), tint color & exposure',
      'Gameplay Space Containers: Manage multiple authored levels (.subscene) like Ashen Outpost or Ruined Sanctum',
      'Single-Active Runtime Rule: Enforces clean loading into Main Scene and complete tear-down of previous objects',
      '3D Object Placement: Position, rotate, and scale placed instances in 3D coordinate space with live shadow projection',
      'Direct Main Scene Mount: 1-click test load to mount this sub-scene directly into the active game loop'
    ],
    version: MASON_VERSION_DISPLAY
  },
  {
    id: 'objects',
    name: 'Objects',
    tagline: 'Entity-Component-Graph architecture: Empty 3D object + Components + Visual Logic Graphs',
    category: 'Core Architecture',
    subfolder: 'modules/objects',
    entryHtml: './modules/objects/index.html',
    associatedFolder: 'objects',
    associatedExtension: '.object',
    iconName: 'Box',
    accentColor: 'purple',
    description: 'Unified Entity-Component-Graph studio. Every object starts as an Empty Object in 3D space with a base transform. Developers attach components (3D Meshes, 2D Sprites, Colliders, Rigidbodies, Player Controllers, and Fray Combatants) and author custom functions on the visual node-based Logic Graph.',
    features: [
      'Base Empty 3D Object: Position, rotation, and scale anchor for all entity types',
      'Modular Component Stack: Attach 3D Meshes, Sprites, Colliders, Lights, Player Controllers, or Fray Combatants',
      'Visual Logic Graph: Dedicated node canvas for each object (Events → Conditions → Actions)',
      'Fray Mechanics Integration: Direct binding for 9-Foci loadout matrix, Insignias, Valor Points, and Action Points',
      'Interactive Execution Simulation: Test logic graph execution, AP spending, and Valor momentum in real time'
    ],
    version: MASON_VERSION_DISPLAY
  }
];

export const getModuleById = (id: string): MasonModuleDefinition | undefined => {
  return MASON_MODULES.find(m => m.id === id);
};
