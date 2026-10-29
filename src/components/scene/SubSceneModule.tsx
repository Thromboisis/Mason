import React, { useState } from 'react';
import {
  Layers,
  Box,
  Plus,
  Trash2,
  Copy,
  Compass,
  Maximize2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Music,
  MapPin,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Shield,
  Move,
  CornerDownRight,
  Cloud,
  Sliders,
  Globe,
  Zap
} from 'lucide-react';
import {
  SubSceneDefinition,
  PlacedObjectInstance,
  SkyboxType,
  createDefaultSubScenes,
  createDefaultObjects,
  MasonGameObject
} from '../../engine/sceneObjectSchema';
import { MasonProject } from '../../engine/masonProjectSchema';

interface SubSceneModuleProps {
  project?: MasonProject;
  onUpdateProject?: (updated: MasonProject | ((prev: MasonProject) => MasonProject)) => void;
  onNavigateToObjects?: (objectId?: string) => void;
  onMountIntoMainScene?: (subSceneId: string) => void;
}

export const SubSceneModule: React.FC<SubSceneModuleProps> = ({
  project,
  onNavigateToObjects,
  onMountIntoMainScene
}) => {
  const [subScenes, setSubScenes] = useState<SubSceneDefinition[]>(createDefaultSubScenes());
  const [availableObjects] = useState<MasonGameObject[]>(createDefaultObjects());
  const [activeSubSceneId, setActiveSubSceneId] = useState<string>(subScenes[0].id);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(subScenes[0].placedObjects[0]?.instanceId || null);
  const [viewAngle, setViewAngle] = useState<'iso' | 'top' | 'front'>('iso');
  const [inspectorMode, setInspectorMode] = useState<'entity' | 'environment'>('environment');
  const [envTab, setEnvTab] = useState<'skybox' | 'lighting' | 'shadows' | 'physics'>('skybox');

  const activeSubScene = subScenes.find(s => s.id === activeSubSceneId) || subScenes[0];
  const selectedInstance = activeSubScene.placedObjects.find(inst => inst.instanceId === selectedInstanceId);

  const handleUpdateActiveSubScene = (updater: (prev: SubSceneDefinition) => SubSceneDefinition) => {
    setSubScenes(prev =>
      prev.map(s => (s.id === activeSubSceneId ? updater(s) : s))
    );
  };

  const handleAddObjectInstance = (objectId: string) => {
    const objDef = availableObjects.find(o => o.id === objectId);
    if (!objDef) return;

    const newInst: PlacedObjectInstance = {
      instanceId: `inst_${Date.now().toString(36)}`,
      objectId: objDef.id,
      name: `${objDef.name} (Instance)`,
      transform: {
        position: [Math.round((Math.random() * 20 - 10) * 10) / 10, 0, Math.round((Math.random() * 20 - 10) * 10) / 10],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      },
      isVisible: true
    };

    handleUpdateActiveSubScene(prev => ({
      ...prev,
      placedObjects: [...prev.placedObjects, newInst]
    }));
    setSelectedInstanceId(newInst.instanceId);
  };

  const handleRemoveInstance = (instanceId: string) => {
    handleUpdateActiveSubScene(prev => ({
      ...prev,
      placedObjects: prev.placedObjects.filter(inst => inst.instanceId !== instanceId)
    }));
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }
  };

  const handleUpdateInstanceTransform = (
    instanceId: string,
    field: 'position' | 'rotation' | 'scale',
    axisIndex: number,
    value: number
  ) => {
    handleUpdateActiveSubScene(prev => ({
      ...prev,
      placedObjects: prev.placedObjects.map(inst => {
        if (inst.instanceId !== instanceId) return inst;
        const updatedVec: [number, number, number] = [...inst.transform[field]];
        updatedVec[axisIndex] = value;
        return {
          ...inst,
          transform: {
            ...inst.transform,
            [field]: updatedVec
          }
        };
      })
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* Header */}
      <header className="px-6 py-4 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">Sub-Scenes Studio</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-md">
                GAMEPLAY CONTAINERS
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Isolated gameplay spaces holding placed 3D objects. Only 1 loaded at runtime.
            </p>
          </div>
        </div>

        {/* Sub-scene Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-1 text-xs">
            {subScenes.map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setActiveSubSceneId(sub.id);
                  setSelectedInstanceId(sub.placedObjects[0]?.instanceId || null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  sub.id === activeSubSceneId
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>

          {onMountIntoMainScene && (
            <button
              type="button"
              onClick={() => onMountIntoMainScene(activeSubSceneId)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Mount into Main Scene
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Workspace: 3 Columns (Hierarchy, 3D Canvas, Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Placed Objects Hierarchy */}
        <div className="w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
          <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-cyan-400" />
              Placed Objects ({activeSubScene.placedObjects.length})
            </span>
          </div>

          {/* Object List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeSubScene.placedObjects.map(inst => {
              const isSelected = inst.instanceId === selectedInstanceId;
              const refObj = availableObjects.find(o => o.id === inst.objectId);

              return (
                <div
                  key={inst.instanceId}
                  onClick={() => setSelectedInstanceId(inst.instanceId)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/60 text-white font-semibold'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                    <div className="truncate">
                      <div className="truncate text-white">{inst.name}</div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        [{inst.transform.position.join(', ')}]
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveInstance(inst.instanceId);
                      }}
                      className="p-1 hover:text-red-400 rounded transition-colors"
                      title="Remove object from sub-scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Place New Object Palette */}
          <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 space-y-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase">Spawn New Object</span>
            <div className="grid grid-cols-1 gap-1.5">
              {availableObjects.map(obj => (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => handleAddObjectInstance(obj.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left text-xs text-neutral-200 flex items-center justify-between transition-colors"
                >
                  <span className="truncate">{obj.name}</span>
                  <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>

            {onNavigateToObjects && (
              <button
                type="button"
                onClick={() => onNavigateToObjects()}
                className="w-full mt-2 text-[11px] text-cyan-400 hover:underline flex items-center justify-center gap-1 pt-1"
              >
                Go to Objects Studio <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Center: 3D Spatial Viewport Canvas */}
        <div className="flex-1 flex flex-col bg-neutral-950 relative overflow-hidden">
          {/* Viewport Top Bar */}
          <div className="px-4 py-2.5 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] text-neutral-400">
                Bounds: {activeSubScene.bounds.width}×{activeSubScene.bounds.height}×{activeSubScene.bounds.depth}m
              </span>
              <span className="text-neutral-700">|</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" />
                Skybox: {activeSubScene.skybox.type}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1">
                Sun: {activeSubScene.lighting.sun.intensity}x ({activeSubScene.lighting.sun.pitchDeg}°)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-emerald-400 flex items-center gap-1">
                Shadows: {activeSubScene.shadows.enabled ? `${activeSubScene.shadows.resolution}px` : 'Off'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewAngle('iso')}
                className={`px-2 py-0.5 rounded ${viewAngle === 'iso' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'}`}
              >
                Isometric 3D
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('top')}
                className={`px-2 py-0.5 rounded ${viewAngle === 'top' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'}`}
              >
                Top-Down
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('front')}
                className={`px-2 py-0.5 rounded ${viewAngle === 'front' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'}`}
              >
                Front View
              </button>
            </div>
          </div>

          {/* Interactive 3D Spatial Canvas Visualizer */}
          <div className="flex-1 flex items-center justify-center p-6 relative">
            {/* Grid Pattern with dynamic Sub-Scene Skybox Backdrop Tint */}
            <div
              className="w-full h-full max-w-4xl max-h-[500px] border border-neutral-800 rounded-2xl relative flex items-center justify-center overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: '#0a0a0c',
                backgroundImage: `
                  radial-gradient(circle at 50% 15%, ${activeSubScene.skybox.tintColor}22 0%, transparent 70%),
                  linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 32px 32px, 32px 32px'
              }}
            >
              {/* Center 3D Origin Axes */}
              <div className="absolute w-6 h-6 border-l-2 border-b-2 border-cyan-500/70 pointer-events-none flex items-center justify-center">
                <span className="text-[9px] font-mono text-cyan-400/80 -mt-5 -ml-5">(0,0,0)</span>
              </div>

              {/* Player Spawn Marker */}
              <div
                className="absolute flex flex-col items-center pointer-events-none transition-all"
                style={{
                  left: `calc(50% + ${activeSubScene.spawnPoint.position[0] * 8}px)`,
                  top: `calc(50% - ${activeSubScene.spawnPoint.position[2] * 8}px)`
                }}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <MapPin className="w-3 h-3" />
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-neutral-900/80 px-1 rounded mt-0.5">Spawn</span>
              </div>

              {/* Placed Object Markers in 3D Space */}
              {activeSubScene.placedObjects.map(inst => {
                const isSelected = inst.instanceId === selectedInstanceId;
                const posX = inst.transform.position[0];
                const posZ = inst.transform.position[2];

                return (
                  <div
                    key={inst.instanceId}
                    onClick={() => {
                      setSelectedInstanceId(inst.instanceId);
                      setInspectorMode('entity');
                    }}
                    className="absolute cursor-pointer flex flex-col items-center group transition-all"
                    style={{
                      left: `calc(50% + ${posX * 12}px)`,
                      top: `calc(50% - ${posZ * 12}px)`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {/* Sub-Scene Managed Ground Shadow Projection */}
                    {activeSubScene.shadows.enabled && (
                      <div
                        className="w-10 h-3 rounded-full pointer-events-none absolute -bottom-1 blur-[1px] transition-transform"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          opacity: activeSubScene.shadows.shadowIntensity,
                          transform: `translate(${Math.sin((activeSubScene.lighting.sun.yawDeg * Math.PI) / 180) * 8}px, ${Math.cos((activeSubScene.lighting.sun.pitchDeg * Math.PI) / 180) * 4}px)`
                        }}
                      />
                    )}

                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-lg transition-transform ${
                        isSelected
                          ? 'bg-cyan-500/30 border-cyan-400 scale-125 shadow-cyan-500/20'
                          : 'bg-neutral-800/90 border-neutral-700 hover:scale-110 hover:border-cyan-500'
                      }`}
                    >
                      <Box className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-neutral-400'}`} />
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded mt-1 whitespace-nowrap ${
                        isSelected
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'bg-neutral-900/90 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {inst.name.split(' ')[0]}
                    </span>
                  </div>
                );
              })}

              {/* Viewport Overlay Controls Guide */}
              <div className="absolute bottom-3 left-3 text-[10px] font-mono text-neutral-500 bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800">
                Click any object icon to inspect 3D Transform & Components
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Entity Transform OR Sub-Scene Skybox, Lights & Shadows */}
        <div className="w-84 bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 overflow-y-auto">
          {/* Top Inspector Tab Switcher */}
          <div className="p-2 border-b border-neutral-800 bg-neutral-950 flex items-center gap-1.5 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setInspectorMode('environment')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                inspectorMode === 'environment'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Sky & Lights</span>
            </button>

            <button
              type="button"
              onClick={() => setInspectorMode('entity')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                inspectorMode === 'entity'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Entity Transform</span>
            </button>
          </div>

          {/* INSPECTOR VIEW 1: SUB-SCENE ENVIRONMENT (SKYBOX, LIGHT SOURCES, SHADOW SOURCES) */}
          {inspectorMode === 'environment' && (
            <div className="p-4 space-y-5 flex-1">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Sub-Scene Managed</span>
                  <span className="text-[10px] font-mono text-neutral-500">{activeSubScene.fileName}</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">Atmosphere, Lights & Shadows</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  Configured independently per sub-scene and dynamically mounted into 3D space when loaded.
                </p>
              </div>

              {/* Sub-Tabs: Skybox / Lighting / Shadows / Physics */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setEnvTab('skybox')}
                  className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center ${
                    envTab === 'skybox' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Skybox
                </button>
                <button
                  type="button"
                  onClick={() => setEnvTab('lighting')}
                  className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center ${
                    envTab === 'lighting' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Lights
                </button>
                <button
                  type="button"
                  onClick={() => setEnvTab('shadows')}
                  className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center ${
                    envTab === 'shadows' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Shadows
                </button>
                <button
                  type="button"
                  onClick={() => setEnvTab('physics')}
                  className={`flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center ${
                    envTab === 'physics' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Physics
                </button>
              </div>

              {/* SECTION A: SKYBOX */}
              {envTab === 'skybox' && (
                <div className="space-y-4">
                  {/* Skybox Preview Swatch */}
                  <div
                    className="p-4 rounded-xl border border-neutral-800 relative overflow-hidden flex flex-col justify-between h-28"
                    style={{
                      background: `linear-gradient(180deg, ${activeSubScene.skybox.tintColor} 0%, rgba(15, 23, 42, 0.9) 100%)`
                    }}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-white/80">
                      <span>Live Skybox Swatch</span>
                      <span>{activeSubScene.skybox.type}</span>
                    </div>
                    <div className="text-white font-bold text-xs uppercase tracking-wider">
                      {activeSubScene.skybox.type.replace('_', ' ')}
                    </div>
                  </div>

                  {/* Skybox Selection */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-neutral-400 block mb-1">Atmospheric Skybox Preset</label>
                      <select
                        value={activeSubScene.skybox.type}
                        onChange={e =>
                          handleUpdateActiveSubScene(prev => ({
                            ...prev,
                            skybox: { ...prev.skybox, type: e.target.value as SkyboxType }
                          }))
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-medium"
                      >
                        <option value="ashen_dusk">Ashen Dusk (Volcanic Orange / Charcoal)</option>
                        <option value="void_horizon">Void Horizon (Deep Violet Rift)</option>
                        <option value="celestial_dawn">Celestial Dawn (Aegis Gold & Cyan)</option>
                        <option value="overworld_noon">Overworld Noon (Clear Sunlight)</option>
                        <option value="deep_space">Deep Space (Starry Cosmos)</option>
                        <option value="volcanic_caldera">Volcanic Caldera (Molten Red Glow)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                      <span className="text-neutral-300">Atmospheric Tint</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeSubScene.skybox.tintColor}
                          onChange={e =>
                            handleUpdateActiveSubScene(prev => ({
                              ...prev,
                              skybox: { ...prev.skybox, tintColor: e.target.value }
                            }))
                          }
                          className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">{activeSubScene.skybox.tintColor}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-400 mb-1">
                        <span>Sky Exposure</span>
                        <span className="font-mono text-white">{activeSubScene.skybox.exposure}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={2.5}
                        step={0.1}
                        value={activeSubScene.skybox.exposure}
                        onChange={e =>
                          handleUpdateActiveSubScene(prev => ({
                            ...prev,
                            skybox: { ...prev.skybox, exposure: parseFloat(e.target.value) }
                          }))
                        }
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-neutral-400 mb-1">
                        <span>Horizon Atmospheric Blur</span>
                        <span className="font-mono text-white">{Math.round(activeSubScene.skybox.horizonBlur * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={1.0}
                        step={0.05}
                        value={activeSubScene.skybox.horizonBlur}
                        onChange={e =>
                          handleUpdateActiveSubScene(prev => ({
                            ...prev,
                            skybox: { ...prev.skybox, horizonBlur: parseFloat(e.target.value) }
                          }))
                        }
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION B: LIGHT SOURCES */}
              {envTab === 'lighting' && (
                <div className="space-y-4 text-xs">
                  {/* Directional Sun */}
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-300 uppercase flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        Directional Sun / Celestial Light
                      </span>
                      <input
                        type="checkbox"
                        checked={activeSubScene.lighting.sun.enabled}
                        onChange={e =>
                          handleUpdateActiveSubScene(prev => ({
                            ...prev,
                            lighting: {
                              ...prev.lighting,
                              sun: { ...prev.lighting.sun, enabled: e.target.checked }
                            }
                          }))
                        }
                        className="rounded accent-amber-500"
                      />
                    </div>

                    {activeSubScene.lighting.sun.enabled && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Sun Light Color</span>
                          <input
                            type="color"
                            value={activeSubScene.lighting.sun.color}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                lighting: {
                                  ...prev.lighting,
                                  sun: { ...prev.lighting.sun, color: e.target.value }
                                }
                              }))
                            }
                            className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-neutral-400 mb-1">
                            <span>Sun Intensity</span>
                            <span className="font-mono text-white">{activeSubScene.lighting.sun.intensity}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.0}
                            max={3.0}
                            step={0.1}
                            value={activeSubScene.lighting.sun.intensity}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                lighting: {
                                  ...prev.lighting,
                                  sun: { ...prev.lighting.sun, intensity: parseFloat(e.target.value) }
                                }
                              }))
                            }
                            className="w-full accent-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-neutral-500 block mb-1">Pitch: {activeSubScene.lighting.sun.pitchDeg}°</span>
                            <input
                              type="range"
                              min={-90}
                              max={90}
                              value={activeSubScene.lighting.sun.pitchDeg}
                              onChange={e =>
                                handleUpdateActiveSubScene(prev => ({
                                  ...prev,
                                  lighting: {
                                    ...prev.lighting,
                                    sun: { ...prev.lighting.sun, pitchDeg: parseInt(e.target.value) }
                                  }
                                }))
                              }
                              className="w-full accent-amber-500"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-neutral-500 block mb-1">Yaw: {activeSubScene.lighting.sun.yawDeg}°</span>
                            <input
                              type="range"
                              min={0}
                              max={360}
                              value={activeSubScene.lighting.sun.yawDeg}
                              onChange={e =>
                                handleUpdateActiveSubScene(prev => ({
                                  ...prev,
                                  lighting: {
                                    ...prev.lighting,
                                    sun: { ...prev.lighting.sun, yawDeg: parseInt(e.target.value) }
                                  }
                                }))
                              }
                              className="w-full accent-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ambient Hemispheric */}
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <span className="text-[11px] font-bold text-neutral-300 uppercase flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      Ambient Hemispheric Illumination
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Sky Dome Tint</span>
                        <input
                          type="color"
                          value={activeSubScene.lighting.ambient.skyColor}
                          onChange={e =>
                            handleUpdateActiveSubScene(prev => ({
                              ...prev,
                              lighting: {
                                ...prev.lighting,
                                ambient: { ...prev.lighting.ambient, skyColor: e.target.value }
                              }
                            }))
                          }
                          className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Ground Bounce Tint</span>
                        <input
                          type="color"
                          value={activeSubScene.lighting.ambient.groundColor}
                          onChange={e =>
                            handleUpdateActiveSubScene(prev => ({
                              ...prev,
                              lighting: {
                                ...prev.lighting,
                                ambient: { ...prev.lighting.ambient, groundColor: e.target.value }
                              }
                            }))
                          }
                          className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-neutral-400 mb-1">
                          <span>Ambient Intensity</span>
                          <span className="font-mono text-white">{activeSubScene.lighting.ambient.intensity}x</span>
                        </div>
                        <input
                          type="range"
                          min={0.0}
                          max={1.5}
                          step={0.05}
                          value={activeSubScene.lighting.ambient.intensity}
                          onChange={e =>
                            handleUpdateActiveSubScene(prev => ({
                              ...prev,
                              lighting: {
                                ...prev.lighting,
                                ambient: { ...prev.lighting.ambient, intensity: parseFloat(e.target.value) }
                              }
                            }))
                          }
                          className="w-full accent-cyan-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Atmospheric Mist & Fog */}
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-300 uppercase flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                        Atmospheric Volumetric Fog
                      </span>
                      <input
                        type="checkbox"
                        checked={activeSubScene.lighting.fog.enabled}
                        onChange={e =>
                          handleUpdateActiveSubScene(prev => ({
                            ...prev,
                            lighting: {
                              ...prev.lighting,
                              fog: { ...prev.lighting.fog, enabled: e.target.checked }
                            }
                          }))
                        }
                        className="rounded accent-indigo-500"
                      />
                    </div>

                    {activeSubScene.lighting.fog.enabled && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Fog Color</span>
                          <input
                            type="color"
                            value={activeSubScene.lighting.fog.color}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                lighting: {
                                  ...prev.lighting,
                                  fog: { ...prev.lighting.fog, color: e.target.value }
                                }
                              }))
                            }
                            className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-neutral-400 mb-1">
                            <span>Fog Density</span>
                            <span className="font-mono text-white">{activeSubScene.lighting.fog.density}</span>
                          </div>
                          <input
                            type="range"
                            min={0.001}
                            max={0.05}
                            step={0.002}
                            value={activeSubScene.lighting.fog.density}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                lighting: {
                                  ...prev.lighting,
                                  fog: { ...prev.lighting.fog, density: parseFloat(e.target.value) }
                                }
                              }))
                            }
                            className="w-full accent-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION C: SHADOW SOURCES */}
              {envTab === 'shadows' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-300 uppercase flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-emerald-400" />
                        Sun & Scene Shadow Casting
                      </span>
                      <input
                        type="checkbox"
                        checked={activeSubScene.shadows.enabled}
                        onChange={e =>
                          handleUpdateActiveSubScene(prev => ({
                            ...prev,
                            shadows: { ...prev.shadows, enabled: e.target.checked }
                          }))
                        }
                        className="rounded accent-emerald-500"
                      />
                    </div>

                    {activeSubScene.shadows.enabled && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="text-neutral-400 block mb-1">Shadow Map Resolution</label>
                          <select
                            value={activeSubScene.shadows.resolution}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                shadows: { ...prev.shadows, resolution: parseInt(e.target.value) as any }
                              }))
                            }
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono"
                          >
                            <option value={512}>512 x 512 (Fast / Low APU Overhead)</option>
                            <option value={1024}>1024 x 1024 (Balanced 90 FPS Target)</option>
                            <option value={2048}>2048 x 2048 (High Crisp Shadows)</option>
                            <option value={4096}>4096 x 4096 (Ultra Cinematic)</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between text-neutral-400 mb-1">
                            <span>Shadow Distance</span>
                            <span className="font-mono text-white">{activeSubScene.shadows.shadowDistance}m</span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={200}
                            step={10}
                            value={activeSubScene.shadows.shadowDistance}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                shadows: { ...prev.shadows, shadowDistance: parseInt(e.target.value) }
                              }))
                            }
                            className="w-full accent-emerald-500"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-neutral-400 mb-1">
                            <span>Shadow Darkness / Opacity</span>
                            <span className="font-mono text-white">{Math.round(activeSubScene.shadows.shadowIntensity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            value={activeSubScene.shadows.shadowIntensity}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                shadows: { ...prev.shadows, shadowIntensity: parseFloat(e.target.value) }
                              }))
                            }
                            className="w-full accent-emerald-500"
                          />
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                          <span className="text-neutral-300">Contact Shadows</span>
                          <input
                            type="checkbox"
                            checked={activeSubScene.shadows.contactShadows}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                shadows: { ...prev.shadows, contactShadows: e.target.checked }
                              }))
                            }
                            className="rounded accent-emerald-500"
                          />
                        </div>

                        <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80 text-[10px] text-neutral-400 leading-relaxed font-mono">
                          Anti-Acne Bias: {activeSubScene.shadows.bias} | Normal: {activeSubScene.shadows.normalBias}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION D: PHYSICS & GRAVITY RULES */}
              {envTab === 'physics' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-300 uppercase flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        Sub-Scene Physics Simulation
                      </span>
                      <input
                        type="checkbox"
                        checked={activeSubScene.physics?.enabled ?? true}
                        onChange={e =>
                          handleUpdateActiveSubScene(prev => ({
                            ...prev,
                            physics: {
                              ...prev.physics,
                              enabled: e.target.checked,
                              gravity: prev.physics?.gravity || [0, -9.81, 0],
                              simulationRateHz: prev.physics?.simulationRateHz || 60
                            }
                          }))
                        }
                        className="rounded accent-cyan-500"
                      />
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Main Scene defines purely empty 3D coordinate space. Gravity vectors, rigidbody velocities, and physics steps are simulated strictly per active Sub-Scene.
                    </p>

                    {activeSubScene.physics?.enabled && (
                      <div className="space-y-3 pt-2">
                        {/* Gravity Presets */}
                        <div>
                          <label className="text-neutral-400 block mb-1">Gravity Preset</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: 'Earth (-9.81 m/s²)', vec: [0, -9.81, 0] as [number, number, number] },
                              { label: 'Low-G Void (-4.50 m/s²)', vec: [0, -4.5, 0] as [number, number, number] },
                              { label: 'Moon (-1.62 m/s²)', vec: [0, -1.62, 0] as [number, number, number] },
                              { label: 'Zero-G Orbital (0.00)', vec: [0, 0, 0] as [number, number, number] }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() =>
                                  handleUpdateActiveSubScene(prev => ({
                                    ...prev,
                                    physics: {
                                      ...prev.physics,
                                      enabled: true,
                                      gravity: preset.vec,
                                      simulationRateHz: prev.physics?.simulationRateHz || 60
                                    }
                                  }))
                                }
                                className={`p-2 rounded-lg border text-left text-[10px] transition-all ${
                                  JSON.stringify(activeSubScene.physics?.gravity) === JSON.stringify(preset.vec)
                                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Y-Gravity Slider */}
                        <div>
                          <div className="flex justify-between text-neutral-400 mb-1">
                            <span>Downforce Gravity (Y-Axis)</span>
                            <span className="font-mono text-white">
                              {activeSubScene.physics?.gravity[1] ?? -9.81} m/s²
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-25}
                            max={5}
                            step={0.5}
                            value={activeSubScene.physics?.gravity[1] ?? -9.81}
                            onChange={e =>
                              handleUpdateActiveSubScene(prev => ({
                                ...prev,
                                physics: {
                                  ...prev.physics,
                                  enabled: true,
                                  gravity: [
                                    prev.physics?.gravity[0] ?? 0,
                                    parseFloat(e.target.value),
                                    prev.physics?.gravity[2] ?? 0
                                  ],
                                  simulationRateHz: prev.physics?.simulationRateHz || 60
                                }
                              }))
                            }
                            className="w-full accent-cyan-500"
                          />
                        </div>

                        {/* Tick Rate */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-neutral-400">Fixed Physics Tick Rate</span>
                          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-cyan-300">
                            {activeSubScene.physics?.simulationRateHz ?? 60} Hz
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INSPECTOR VIEW 2: SELECTED INSTANCE TRANSFORM */}
          {inspectorMode === 'entity' && (
            <div className="p-4 space-y-5 flex-1">
              {selectedInstance ? (
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">Selected Instance</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedInstance.name}</h3>
                    <span className="text-[10px] font-mono text-cyan-400">{selectedInstance.instanceId}</span>
                  </div>

                  {/* 3D Transform Matrix */}
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-cyan-400" />
                      3D Transform Matrix
                    </span>

                    {/* Position */}
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Position (X, Y, Z)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['X', 'Y', 'Z'].map((axis, i) => (
                          <div key={axis} className="flex items-center bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs">
                            <span className="text-[10px] font-mono text-neutral-500 mr-1">{axis}:</span>
                            <input
                              type="number"
                              step="0.5"
                              value={selectedInstance.transform.position[i]}
                              onChange={e => handleUpdateInstanceTransform(selectedInstance.instanceId, 'position', i, parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent text-white font-mono outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rotation */}
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Rotation Deg (X, Y, Z)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['rX', 'rY', 'rZ'].map((axis, i) => (
                          <div key={axis} className="flex items-center bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs">
                            <span className="text-[10px] font-mono text-neutral-500 mr-1">{axis}:</span>
                            <input
                              type="number"
                              step="5"
                              value={selectedInstance.transform.rotation[i]}
                              onChange={e => handleUpdateInstanceTransform(selectedInstance.instanceId, 'rotation', i, parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent text-white font-mono outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scale */}
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Scale (X, Y, Z)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['sX', 'sY', 'sZ'].map((axis, i) => (
                          <div key={axis} className="flex items-center bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs">
                            <span className="text-[10px] font-mono text-neutral-500 mr-1">{axis}:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedInstance.transform.scale[i]}
                              onChange={e => handleUpdateInstanceTransform(selectedInstance.instanceId, 'scale', i, parseFloat(e.target.value) || 1)}
                              className="w-full bg-transparent text-white font-mono outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Jump to Object Studio */}
                  {onNavigateToObjects && (
                    <button
                      type="button"
                      onClick={() => onNavigateToObjects(selectedInstance.objectId)}
                      className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Box className="w-3.5 h-3.5 text-cyan-400" />
                      Edit Object Components & Logic
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
                  <Box className="w-8 h-8 text-neutral-700" />
                  <p className="text-xs">No object selected</p>
                  <p className="text-[11px] text-neutral-600">Select an object in the list or canvas to manipulate its 3D transform.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
