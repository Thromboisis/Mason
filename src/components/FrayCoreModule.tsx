import React, { useState, useEffect } from 'react';
import { 
  MasonProject 
} from '../engine/masonProjectSchema';
import { 
  FrayGameCoreBundle,
  FrayLoadout,
  FrayInsignia,
  FrayFociAbility,
  FRAY_9_FOCI_SLOTS,
  GameGenreControllerType,
  createDefaultFrayGameCore
} from '../engine/frayUniverseSchema';
import { addToastLog } from '../utils/toastLogStore';
import { 
  Shield, 
  Sword, 
  Zap, 
  Flame, 
  Sparkles, 
  Eye, 
  Play, 
  RotateCcw, 
  Sliders, 
  Settings, 
  Folder, 
  Tv, 
  Volume2, 
  Monitor, 
  Gamepad2, 
  Plus, 
  Trash2, 
  Check, 
  Info, 
  Maximize2, 
  Compass, 
  Radio, 
  Crosshair, 
  Activity,
  Layers,
  ChevronRight,
  Save,
  Clock,
  User,
  Heart,
  Award
} from 'lucide-react';

interface FrayCoreModuleProps {
  project: MasonProject;
  onUpdateProject: (updater: (prev: MasonProject) => MasonProject, options?: any) => void;
  onNavigateToModule?: (moduleId: string) => void;
  onBackToDashboard?: () => void;
}

export const FrayCoreModule: React.FC<FrayCoreModuleProps> = ({
  project,
  onUpdateProject,
  onNavigateToModule,
  onBackToDashboard
}) => {
  // Load or initialize Fray Core state
  const [coreData, setCoreData] = useState<FrayGameCoreBundle>(() => {
    return (project as any).frayCore || createDefaultFrayGameCore();
  });

  // Top-Level Mode: Universal Game Suite vs Fray Mechanics
  const [primaryPillar, setPrimaryPillar] = useState<'universal_pipeline' | 'fray_mechanics'>('universal_pipeline');

  // Sub-tabs
  type UniversalTab = 'splash_screen' | 'start_menu' | 'settings' | 'save_load' | 'cutscenes' | 'player_controller';
  type FrayTab = 'foci_loadouts' | 'insignias' | 'valor_points' | 'action_points';

  const [activeUniversalTab, setActiveUniversalTab] = useState<UniversalTab>('start_menu');
  const [activeFrayTab, setActiveFrayTab] = useState<FrayTab>('foci_loadouts');

  // Interactive Live Simulators
  const [liveValor, setLiveValor] = useState<number>(45);
  const [liveAp, setLiveAp] = useState<number>(100);
  const [apDepletedAlert, setApDepletedAlert] = useState<boolean>(false);
  const [activeFociSlotPreview, setActiveFociSlotPreview] = useState<number>(0);
  const [cutscenePlaying, setCutscenePlaying] = useState<boolean>(false);
  const [cutsceneKeyframeIdx, setCutsceneKeyframeIdx] = useState<number>(0);

  // Live AP Regeneration Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveAp(prev => Math.min(coreData.actionConfig.max, prev + (coreData.actionConfig.regenPerSecond * 0.1)));
    }, 100);
    return () => clearInterval(timer);
  }, [coreData.actionConfig]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    addToastLog(text, type);
  };

  const handleSpendAp = (cost: number, actionName: string) => {
    if (liveAp < cost) {
      setApDepletedAlert(true);
      setTimeout(() => setApDepletedAlert(false), 800);
      showToast(`Not enough Action Points for ${actionName}! (Needs ${cost} AP)`, 'error');
      return;
    }
    setLiveAp(prev => Math.max(0, prev - cost));
    showToast(`Executed ${actionName} (-${cost} AP)`, 'info');
  };

  const handleGainValor = (amount: number, reason: string) => {
    setLiveValor(prev => {
      const nextVal = Math.min(coreData.valorConfig.max, prev + amount);
      showToast(`+${amount} Valor Points: ${reason}`, 'success');
      return nextVal;
    });
  };

  // Helper to persist changes into MasonProject
  const saveCoreData = (newBundle: FrayGameCoreBundle) => {
    setCoreData(newBundle);
    onUpdateProject(prev => ({
      ...prev,
      frayCore: newBundle,
      updatedAt: new Date().toISOString()
    } as any));
    showToast('Game Architecture & Fray Systems Updated', 'success');
  };

  const activeInsignia = coreData.insignias.find(i => i.id === coreData.activeLoadout.insigniaId) || coreData.insignias[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
            🔱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wide text-slate-100">
                Fray Universe Game Foundation
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold">
                Universal Base + Fray Mechanics
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Low-overhead base game scaffolding paired with persistent Fray loadout systems.
            </p>
          </div>
        </div>

        {/* Primary Pillar Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
          <button
            type="button"
            onClick={() => setPrimaryPillar('universal_pipeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              primaryPillar === 'universal_pipeline'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Universal Game Pipeline</span>
          </button>

          <button
            type="button"
            onClick={() => setPrimaryPillar('fray_mechanics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              primaryPillar === 'fray_mechanics'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Fray Gameplay Mechanics</span>
          </button>
        </div>

        {/* Back / Close button */}
        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
          >
            Back to Dashboard
          </button>
        )}
      </div>

      {/* Secondary Sub-Navigation */}
      <div className="h-11 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/40 text-xs">
        {primaryPillar === 'universal_pipeline' ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveUniversalTab('start_menu')}
              className={`px-3 py-1 rounded-md transition ${activeUniversalTab === 'start_menu' ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Start Menu
            </button>
            <button
              onClick={() => setActiveUniversalTab('splash_screen')}
              className={`px-3 py-1 rounded-md transition ${activeUniversalTab === 'splash_screen' ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Splash Screen
            </button>
            <button
              onClick={() => setActiveUniversalTab('settings')}
              className={`px-3 py-1 rounded-md transition ${activeUniversalTab === 'settings' ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Settings (Audio / Display / Input)
            </button>
            <button
              onClick={() => setActiveUniversalTab('save_load')}
              className={`px-3 py-1 rounded-md transition ${activeUniversalTab === 'save_load' ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Save & Load Slots
            </button>
            <button
              onClick={() => setActiveUniversalTab('cutscenes')}
              className={`px-3 py-1 rounded-md transition ${activeUniversalTab === 'cutscenes' ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Cutscenes & Cinematics
            </button>
            <button
              onClick={() => setActiveUniversalTab('player_controller')}
              className={`px-3 py-1 rounded-md transition ${activeUniversalTab === 'player_controller' ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Player Controller Archetype
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveFrayTab('foci_loadouts')}
              className={`px-3 py-1 rounded-md transition ${activeFrayTab === 'foci_loadouts' ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              9-Foci Matrix & Loadouts
            </button>
            <button
              onClick={() => setActiveFrayTab('insignias')}
              className={`px-3 py-1 rounded-md transition ${activeFrayTab === 'insignias' ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Insignias & Crests
            </button>
            <button
              onClick={() => setActiveFrayTab('valor_points')}
              className={`px-3 py-1 rounded-md transition ${activeFrayTab === 'valor_points' ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Valor Points (VP) Economy
            </button>
            <button
              onClick={() => setActiveFrayTab('action_points')}
              className={`px-3 py-1 rounded-md transition ${activeFrayTab === 'action_points' ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Action Points (AP) Budgeting
            </button>
          </div>
        )}

        {/* Live HUD Mini-Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-400">Valor:</span>
            <span className="font-mono text-amber-300 font-bold">{liveValor} VP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${apDepletedAlert ? 'text-red-400 animate-bounce' : 'text-cyan-400'}`} />
            <span className="text-[10px] text-slate-400">Action:</span>
            <span className="font-mono text-cyan-300 font-bold">{Math.round(liveAp)} AP</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        
        {/* ======================================================== */}
        {/* 1. UNIVERSAL GAME SUITE CONTENT                          */}
        {/* ======================================================== */}
        {primaryPillar === 'universal_pipeline' && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-2 space-y-6">
            
            {/* START MENU TAB */}
            {activeUniversalTab === 'start_menu' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Configuration */}
                <div className="lg:col-span-5 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Tv className="w-4 h-4 text-indigo-400" />
                    Start Menu Configuration
                  </h3>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">Game Title</label>
                    <input
                      type="text"
                      value={coreData.startMenu.title}
                      onChange={e => saveCoreData({
                        ...coreData,
                        startMenu: { ...coreData.startMenu, title: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={coreData.startMenu.subtitle}
                      onChange={e => saveCoreData({
                        ...coreData,
                        startMenu: { ...coreData.startMenu, subtitle: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">Background Backdrop</label>
                    <select
                      value={coreData.startMenu.backgroundType}
                      onChange={e => saveCoreData({
                        ...coreData,
                        startMenu: { ...coreData.startMenu, backgroundType: e.target.value as any }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    >
                      <option value="3d_scene">3D Scene / Voxel Landscape</option>
                      <option value="parallax_biome">7-Layer Parallax Biome</option>
                      <option value="dark_gradient">Atmospheric Dark Gradient</option>
                      <option value="cinematic_loop">Cinematic Video Loop</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Menu Buttons & Navigation
                    </span>
                    <div className="space-y-1.5">
                      {coreData.startMenu.menuItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
                          <span className="font-medium text-slate-200">{item.label}</span>
                          <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/40">
                            {item.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Live Interactive Menu Preview */}
                <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col relative min-h-[420px] shadow-2xl">
                  {/* Fake Screen Bezel */}
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-slate-950/80 to-slate-950 pointer-events-none" />
                  
                  {/* Decorative background grid & atmospheric glow */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Top Bar inside preview */}
                  <div className="p-4 flex items-center justify-between z-10">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Live Start Screen Preview (1280x800)</span>
                    <span className="text-[10px] font-mono text-emerald-400">90 FPS Ready</span>
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 flex flex-col justify-center items-start px-12 z-10">
                    <div className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-sky-200 to-indigo-400">
                      {coreData.startMenu.title}
                    </div>
                    <div className="text-sm font-medium tracking-wider text-sky-400 mt-1 uppercase">
                      {coreData.startMenu.subtitle}
                    </div>

                    {/* Menu Buttons list */}
                    <div className="mt-8 space-y-2.5 w-60">
                      {coreData.startMenu.menuItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => showToast(`Clicked Menu: ${item.label}`, 'info')}
                          className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500/50 text-xs font-semibold text-slate-200 transition flex items-center justify-between group"
                        >
                          <span>{item.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between text-[11px] text-slate-500 z-10 border-t border-slate-900">
                    <span>{coreData.startMenu.versionLabel}</span>
                    <span>Press Any Key / Gamepad A</span>
                  </div>
                </div>
              </div>
            )}

            {/* SPLASH SCREEN TAB */}
            {activeUniversalTab === 'splash_screen' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Splash Screen Settings
                  </h3>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">Studio / Universe Name</label>
                    <input
                      type="text"
                      value={coreData.splashScreen.studioName}
                      onChange={e => saveCoreData({
                        ...coreData,
                        splashScreen: { ...coreData.splashScreen, studioName: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">Tagline</label>
                    <input
                      type="text"
                      value={coreData.splashScreen.studioTagline}
                      onChange={e => saveCoreData({
                        ...coreData,
                        splashScreen: { ...coreData.splashScreen, studioTagline: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Duration (ms)</label>
                      <input
                        type="number"
                        step="500"
                        value={coreData.splashScreen.durationMs}
                        onChange={e => saveCoreData({
                          ...coreData,
                          splashScreen: { ...coreData.splashScreen, durationMs: parseInt(e.target.value) || 2000 }
                        })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Fade Transition</label>
                      <input
                        type="number"
                        step="100"
                        value={coreData.splashScreen.fadeDurationMs}
                        onChange={e => saveCoreData({
                          ...coreData,
                          splashScreen: { ...coreData.splashScreen, fadeDurationMs: parseInt(e.target.value) || 500 }
                        })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-2 border-t border-slate-800">
                    <span>Allow Player Skip (Space / Button)</span>
                    <input
                      type="checkbox"
                      checked={coreData.splashScreen.skipAllowed}
                      onChange={e => saveCoreData({
                        ...coreData,
                        splashScreen: { ...coreData.splashScreen, skipAllowed: e.target.checked }
                      })}
                      className="accent-indigo-500"
                    />
                  </label>
                </div>

                <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-12 min-h-[400px]">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-4xl mb-4 shadow-xl shadow-indigo-950">
                    {coreData.splashScreen.logoGlyph}
                  </div>
                  <div className="text-xl font-bold tracking-widest text-slate-100 uppercase">
                    {coreData.splashScreen.studioName}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 italic tracking-wide">
                    {coreData.splashScreen.studioTagline}
                  </div>
                  <div className="mt-8 text-[10px] text-slate-600 font-mono">
                    Showing for {(coreData.splashScreen.durationMs / 1000).toFixed(1)}s • Press Space to Skip
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeUniversalTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Audio Settings */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Audio Mixing Channels
                  </h4>
                  {['masterVolume', 'musicVolume', 'sfxVolume', 'voiceVolume'].map(channel => (
                    <div key={channel}>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span className="capitalize">{channel.replace('Volume', '')}</span>
                        <span className="font-mono text-emerald-400">{(coreData.settings.audio as any)[channel]}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={(coreData.settings.audio as any)[channel]}
                        onChange={e => saveCoreData({
                          ...coreData,
                          settings: {
                            ...coreData.settings,
                            audio: {
                              ...coreData.settings.audio,
                              [channel]: parseInt(e.target.value)
                            }
                          }
                        })}
                        className="w-full accent-emerald-500 h-1.5"
                      />
                    </div>
                  ))}
                </div>

                {/* Display & Steam Deck Target */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-sky-400" />
                    Display & Handheld APU
                  </h4>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Resolution</label>
                    <select
                      value={coreData.settings.display.resolution}
                      onChange={e => saveCoreData({
                        ...coreData,
                        settings: {
                          ...coreData.settings,
                          display: { ...coreData.settings.display, resolution: e.target.value }
                        }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                    >
                      <option value="1280x800">1280x800 (Steam Deck Native 16:10)</option>
                      <option value="1920x1080">1920x1080 (1080p FHD)</option>
                      <option value="2560x1440">2560x1440 (1440p QHD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Target Frame Rate</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[60, 90, 120].map(fps => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => saveCoreData({
                            ...coreData,
                            settings: {
                              ...coreData.settings,
                              display: { ...coreData.settings.display, targetFrameRate: fps as any }
                            }
                          })}
                          className={`py-1 rounded text-xs font-mono font-bold transition ${
                            coreData.settings.display.targetFrameRate === fps
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {fps} FPS
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer pt-2">
                    <span>Variable Rate Shading (VRS)</span>
                    <input
                      type="checkbox"
                      checked={coreData.settings.display.vrsEnabled}
                      onChange={e => saveCoreData({
                        ...coreData,
                        settings: {
                          ...coreData.settings,
                          display: { ...coreData.settings.display, vrsEnabled: e.target.checked }
                        }
                      })}
                      className="accent-sky-500"
                    />
                  </label>
                </div>

                {/* Gameplay & Feedback */}
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-purple-400" />
                    Gameplay & Combat Pacing
                  </h4>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Pacing Difficulty</label>
                    <select
                      value={coreData.settings.gameplay.difficulty}
                      onChange={e => saveCoreData({
                        ...coreData,
                        settings: {
                          ...coreData.settings,
                          gameplay: { ...coreData.settings.gameplay, difficulty: e.target.value as any }
                        }
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                    >
                      <option value="story">Story (Forgiving Action Points)</option>
                      <option value="tactical">Tactical (Standard Deliberate Pacing)</option>
                      <option value="fray_hardened">Fray-Hardened (Punishing Staggers)</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Floating Combat Text (FCT)</span>
                    <input
                      type="checkbox"
                      checked={coreData.settings.gameplay.floatingCombatText}
                      onChange={e => saveCoreData({
                        ...coreData,
                        settings: {
                          ...coreData.settings,
                          gameplay: { ...coreData.settings.gameplay, floatingCombatText: e.target.checked }
                        }
                      })}
                      className="accent-purple-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* SAVE & LOAD SYSTEM TAB */}
            {activeUniversalTab === 'save_load' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-400" />
                    Campaign Save / Load System
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newSlot = {
                        slotId: coreData.savedSlots.length + 1,
                        saveName: `New Checkpoint (${coreData.savedSlots.length + 1})`,
                        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                        playtimeSeconds: 120,
                        currentMapOrScene: 'cavern_depths_02.terrain',
                        playerLevel: 1,
                        equippedInsigniaId: coreData.insignias[0].id,
                        activeFociLoadoutId: coreData.activeLoadout.id,
                        valorPoints: 0,
                        actionPoints: 100,
                        progressionFlags: {},
                      };
                      saveCoreData({
                        ...coreData,
                        savedSlots: [...coreData.savedSlots, newSlot]
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Save Slot
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coreData.savedSlots.map(slot => (
                    <div key={slot.slotId} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">Slot {slot.slotId}: {slot.saveName}</span>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {slot.timestamp}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-850">
                          <div>Level: <span className="text-slate-200 font-bold">{slot.playerLevel}</span></div>
                          <div>Map: <span className="text-slate-200 font-mono text-[10px]">{slot.currentMapOrScene}</span></div>
                          <div>Valor: <span className="text-amber-400 font-mono">{slot.valorPoints} VP</span></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => showToast(`Loaded Save Slot ${slot.slotId}!`, 'success')}
                          className="flex-1 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 rounded-lg text-xs font-semibold text-indigo-200 hover:text-white transition"
                        >
                          Load Journey
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            saveCoreData({
                              ...coreData,
                              savedSlots: coreData.savedSlots.filter(s => s.slotId !== slot.slotId)
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PLAYER CONTROLLER ARCHETYPE */}
            {activeUniversalTab === 'player_controller' && (
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    Genre Player Controller Archetype
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select the active locomotion and camera framework. Mason swaps the underlying physics and input controller seamlessly while preserving all Fray Foci and Insignia mechanics.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'third_person_rpg', name: 'Third-Person Action RPG', desc: 'Over-the-shoulder, combat lock-on, stamina/AP dodge rolls, deliberate heavy melee.', icon: '🛡️' },
                    { id: 'first_person_shooter', name: 'First-Person Shooter', desc: 'Direct viewmodel weapon aim, ADS zoom, recoil impulse, and mouse pitch/yaw.', icon: '🎯' },
                    { id: 'rts_commander', name: 'RTS / Tactical Commander', desc: 'Top-down isometric view, marquee box select, rally coordinates, team Action Point budget.', icon: '♟️' },
                    { id: 'sidescroller_platformer', name: '2D Metroidvania Platformer', desc: '2D kinematic collision, variable-height jump, wall climbs, and horizontal dashing.', icon: '🏃' },
                  ].map(arch => (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => saveCoreData({
                        ...coreData,
                        gameGenre: arch.id as GameGenreControllerType,
                        playerController: {
                          ...coreData.playerController,
                          genreType: arch.id as GameGenreControllerType
                        }
                      })}
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                        coreData.playerController.genreType === arch.id
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                      }`}
                    >
                      <div>
                        <div className="text-2xl mb-2">{arch.icon}</div>
                        <div className="text-xs font-bold text-slate-200">{arch.name}</div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{arch.desc}</div>
                      </div>
                      <div className="mt-4 pt-2 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Active Controller:</span>
                        <span className={coreData.playerController.genreType === arch.id ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
                          {coreData.playerController.genreType === arch.id ? 'SELECTED' : 'STANDBY'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Walk / Run Speed:</span>
                    <span className="font-mono text-cyan-300 font-bold">{coreData.playerController.walkSpeed}m / {coreData.playerController.runSpeed}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Dash Speed:</span>
                    <span className="font-mono text-cyan-300 font-bold">{coreData.playerController.dashSpeed} m/s</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Combat Lock-On Range:</span>
                    <span className="font-mono text-cyan-300 font-bold">{coreData.playerController.combatLockOnRange}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Dodge AP Cost:</span>
                    <span className="font-mono text-amber-300 font-bold">{coreData.playerController.dodgeStaminaCost} AP</span>
                  </div>
                </div>
              </div>
            )}

            {/* CUTSCENES TAB */}
            {activeUniversalTab === 'cutscenes' && (
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Tv className="w-4 h-4 text-purple-400" />
                      In-Game Cutscenes & Staging
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Orchestrate camera movements, letterbox bars, and dialogue sequences without writing custom scripts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCutscenePlaying(!cutscenePlaying);
                      showToast(cutscenePlaying ? 'Cutscene stopped' : 'Previewing cutscene...', 'info');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {cutscenePlaying ? 'Stop Cinematic' : 'Play Live Cutscene'}
                  </button>
                </div>

                {/* Cutscene Keyframe Timeline */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300">
                    Track: {coreData.cutscenes[0].name} ({(coreData.cutscenes[0].durationMs / 1000).toFixed(1)}s)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {coreData.cutscenes[0].keyframes.map((kf, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between font-mono text-[10px] text-purple-400">
                          <span>Keyframe {idx + 1}</span>
                          <span>T = {(kf.timeMs / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="font-semibold text-slate-200">{kf.dialogueSpeaker}:</div>
                        <div className="text-slate-400 italic">"{kf.dialogueText}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* 2. FRAY UNIVERSE MECHANICS CONTENT                       */}
        {/* ======================================================== */}
        {primaryPillar === 'fray_mechanics' && (
          <div className="flex-1 flex flex-col overflow-y-auto pr-2 space-y-6">

            {/* 9-FOCI LOADOUTS MATRIX */}
            {activeFrayTab === 'foci_loadouts' && (
              <div className="space-y-6">
                {/* Active Loadout Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-600/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">Active Combat Loadout</span>
                    <h3 className="text-base font-bold text-slate-100 mt-0.5">{coreData.activeLoadout.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">{coreData.activeLoadout.description}</p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <div className="text-slate-400">Max AP: <span className="text-cyan-400 font-bold">{coreData.activeLoadout.totalActionPoints}</span></div>
                    <div className="text-slate-400">Insignia: <span className="text-amber-300 font-bold">{activeInsignia.name}</span></div>
                  </div>
                </div>

                {/* 9-Foci Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      9 Foci Matrix (Active Ability Slots)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Click any Focus slot to inspect ability parameters
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {FRAY_9_FOCI_SLOTS.map(slot => {
                      const abilityId = coreData.activeLoadout.equippedFoci[slot.slotIndex];
                      const ability = coreData.fociCatalog.find(f => f.id === abilityId);
                      const isSelected = activeFociSlotPreview === slot.slotIndex;

                      return (
                        <div
                          key={slot.slotIndex}
                          onClick={() => setActiveFociSlotPreview(slot.slotIndex)}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                            isSelected
                              ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
                              : 'bg-slate-900/70 border-slate-800 hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">
                              Slot {slot.slotIndex + 1}: {slot.slotName}
                            </span>
                            <span className="text-sm">{ability?.iconGlyph || '🔘'}</span>
                          </div>

                          <div className="text-xs font-bold text-slate-200">
                            {ability ? ability.name : 'Empty Focus Slot'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {ability?.description || slot.description}
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-cyan-400 font-bold">{ability?.actionPointCost ?? 0} AP</span>
                            {ability?.valorPointCost ? (
                              <span className="text-amber-400 font-bold">{ability.valorPointCost} VP</span>
                            ) : null}
                            <span className="text-slate-500 uppercase">{slot.recommendedModality}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Focus Detail & Test Execution */}
                {(() => {
                  const currentSlot = FRAY_9_FOCI_SLOTS[activeFociSlotPreview];
                  const currentAbilityId = coreData.activeLoadout.equippedFoci[activeFociSlotPreview];
                  const currentAbility = coreData.fociCatalog.find(f => f.id === currentAbilityId);

                  return (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-6">
                      <div>
                        <div className="text-xs font-bold text-slate-300">
                          Inspect Slot {activeFociSlotPreview + 1}: {currentAbility?.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Base Damage: <span className="font-mono text-slate-200 font-bold">{currentAbility?.damage}</span> • 
                          Stagger: <span className="font-mono text-slate-200 font-bold">{currentAbility?.staggerDamage}</span> • 
                          Modality: <span className="font-mono text-cyan-300 uppercase">{currentAbility?.modality}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentAbility) return;
                            handleSpendAp(currentAbility.actionPointCost, currentAbility.name);
                            if (currentAbility.valorPointCost) {
                              setLiveValor(prev => Math.max(0, prev - currentAbility.valorPointCost));
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Test Cast ({currentAbility?.actionPointCost ?? 0} AP)
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* INSIGNIAS TAB */}
            {activeFrayTab === 'insignias' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Fray Insignia System
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Insignias represent faction allegiance, martial crests, and passive combat synergies. Equipping an Insignia modifies Action Point pools and Valor generation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {coreData.insignias.map(insignia => {
                    const isEquipped = coreData.activeLoadout.insigniaId === insignia.id;

                    return (
                      <div
                        key={insignia.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
                          isEquipped
                            ? 'bg-amber-950/40 border-amber-500 shadow-xl shadow-amber-950/50 ring-1 ring-amber-500/40'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-3xl">{insignia.sigilIcon}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                              {insignia.rarity}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-slate-100">{insignia.name}</div>
                          <div className="text-[11px] font-medium text-amber-400 mt-0.5">{insignia.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{insignia.factionOrOrder}</div>

                          <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-850">
                            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              {insignia.passivePerkName}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {insignia.passivePerkDescription}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                            <div>Valor Bonus: <span className="text-amber-300">+{insignia.valorGenerationBonusPct}%</span></div>
                            <div>Max AP Bonus: <span className="text-cyan-300">+{insignia.actionPointBonus}</span></div>
                          </div>
                        </div>

                        <div className="mt-6 pt-3 border-t border-slate-800/80">
                          {isEquipped ? (
                            <div className="w-full py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold text-center border border-amber-500/40 flex items-center justify-center gap-1.5">
                              <Check className="w-3.5 h-3.5" />
                              Currently Equipped
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                saveCoreData({
                                  ...coreData,
                                  activeLoadout: {
                                    ...coreData.activeLoadout,
                                    insigniaId: insignia.id
                                  }
                                });
                              }}
                              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                            >
                              Equip Insignia
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VALOR POINTS TAB */}
            {activeFrayTab === 'valor_points' && (
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Valor Points (VP) Economy Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Valor is the momentum resource earned through deliberate combat mastery (timed parries, guard breaks, consecutive strikes). When Valor crosses the Overdrive Threshold (75+), ultimate Foci powers unlock.
                  </p>
                </div>

                {/* Big Valor Meter */}
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Current Valor Pool</span>
                    <span className="text-xl font-mono font-black text-amber-400">
                      {liveValor} <span className="text-xs text-slate-500 font-normal">/ {coreData.valorConfig.max} VP</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 transition-all duration-300"
                      style={{ width: `${(liveValor / coreData.valorConfig.max) * 100}%` }}
                    />
                    {/* Overdrive marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-sm"
                      style={{ left: `${coreData.valorConfig.overdriveThreshold}%` }}
                      title="Overdrive Threshold (75 VP)"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>0 VP (Idle)</span>
                    <span className="text-red-400 font-bold">Overdrive Gate (75 VP)</span>
                    <span>100 VP (Max)</span>
                  </div>
                </div>

                {/* Interactive Gain Buttons */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Simulate Combat Feats
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => handleGainValor(coreData.valorConfig.gainOnParry, 'Timed Aegis Parry')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-200">Timed Parry</div>
                      <div className="text-[10px] text-amber-400 font-mono mt-0.5">+{coreData.valorConfig.gainOnParry} VP</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGainValor(coreData.valorConfig.gainOnStagger, 'Guard Break Stagger')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-200">Guard Break</div>
                      <div className="text-[10px] text-amber-400 font-mono mt-0.5">+{coreData.valorConfig.gainOnStagger} VP</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGainValor(coreData.valorConfig.gainOnCombo, '3-Hit Strike Chain')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-200">3-Hit Chain</div>
                      <div className="text-[10px] text-amber-400 font-mono mt-0.5">+{coreData.valorConfig.gainOnCombo} VP</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLiveValor(0);
                        showToast('Reset Valor meter to 0', 'info');
                      }}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-400">Clear Valor</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">Reset Pool</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION POINTS TAB */}
            {activeFrayTab === 'action_points' && (
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Action Points (AP) Budgeting Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Action Points dictate the cadence of strikes, dodges, and Focus casts. Regenerates continuously at {coreData.actionConfig.regenPerSecond} AP/sec.
                  </p>
                </div>

                {/* Big AP Meter */}
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Action Points Pool (Real-time Regen)</span>
                    <span className="text-xl font-mono font-black text-cyan-400">
                      {Math.round(liveAp)} <span className="text-xs text-slate-500 font-normal">/ {coreData.actionConfig.max} AP</span>
                    </span>
                  </div>

                  <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-sky-400 to-indigo-400 transition-all duration-100"
                      style={{ width: `${(liveAp / coreData.actionConfig.max) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>0 AP (Exhausted / Stagger Vulnerable)</span>
                    <span className="text-cyan-400 font-mono">Regen: +{coreData.actionConfig.regenPerSecond} AP/s</span>
                    <span>100 AP (Full Buffer)</span>
                  </div>
                </div>

                {/* Spend AP Actions */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Test Action Costs
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSpendAp(coreData.actionConfig.costs.lightStrike, 'Light Strike')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-200">Light Strike</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">-{coreData.actionConfig.costs.lightStrike} AP</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpendAp(coreData.actionConfig.costs.heavyStrike, 'Heavy Strike')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-200">Heavy Strike</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">-{coreData.actionConfig.costs.heavyStrike} AP</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpendAp(coreData.actionConfig.costs.dodgeRoll, 'Dodge Roll')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-200">Dodge Roll</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">-{coreData.actionConfig.costs.dodgeRoll} AP</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpendAp(coreData.actionConfig.costs.parryBlock, 'Aegis Block')}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition"
                    >
                      <div className="text-xs font-bold text-slate-200">Aegis Block</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">-{coreData.actionConfig.costs.parryBlock} AP</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
