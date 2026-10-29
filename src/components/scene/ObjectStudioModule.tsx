import React, { useState } from 'react';
import {
  Box,
  Layers,
  Plus,
  Trash2,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  Zap,
  Activity,
  ChevronRight,
  Move,
  Flame,
  Volume2,
  Sun,
  Eye,
  Radio,
  Share2,
  CheckCircle2,
  Settings,
  HelpCircle,
  FileCode
} from 'lucide-react';
import {
  MasonGameObject,
  MasonComponent,
  ObjectLogicGraph,
  LogicNode,
  LogicEdge,
  ComponentType,
  createDefaultObjects
} from '../../engine/sceneObjectSchema';
import {
  DEFAULT_FRAY_FOCI_CATALOG,
  DEFAULT_FRAY_INSIGNIAS
} from '../../engine/frayUniverseSchema';
import { MasonProject } from '../../engine/masonProjectSchema';

interface ObjectStudioModuleProps {
  project?: MasonProject;
  initialObjectId?: string;
  onUpdateProject?: (updated: MasonProject | ((prev: MasonProject) => MasonProject)) => void;
  onNavigateToSubScenes?: () => void;
}

export const ObjectStudioModule: React.FC<ObjectStudioModuleProps> = ({
  project,
  initialObjectId,
  onNavigateToSubScenes
}) => {
  const [objects, setObjects] = useState<MasonGameObject[]>(createDefaultObjects());
  const [selectedObjectId, setSelectedObjectId] = useState<string>(initialObjectId || objects[0]?.id || 'obj_hero_vanguard');
  const [activeTab, setActiveTab] = useState<'components' | 'logic_graph' | 'fray_loadout'>('components');
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const currentObject = objects.find(o => o.id === selectedObjectId) || objects[0];

  const handleUpdateCurrentObject = (updater: (prev: MasonGameObject) => MasonGameObject) => {
    setObjects(prev =>
      prev.map(o => (o.id === selectedObjectId ? updater(o) : o))
    );
  };

  const handleCreateNewObject = () => {
    const newId = `obj_${Date.now().toString(36)}`;
    const newObj: MasonGameObject = {
      id: newId,
      name: 'New Empty 3D Object',
      category: 'prop',
      baseTransform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      },
      components: [],
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
          }
        ],
        edges: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setObjects(prev => [...prev, newObj]);
    setSelectedObjectId(newId);
  };

  const handleAddComponent = (type: ComponentType) => {
    let newComp: MasonComponent;

    switch (type) {
      case 'visual_mesh':
        newComp = {
          type: 'visual_mesh',
          primitiveType: 'cube',
          color: '#3b82f6',
          roughness: 0.5,
          metalness: 0.2,
          castShadows: true,
          receiveShadows: true
        };
        break;
      case 'visual_sprite':
        newComp = {
          type: 'visual_sprite',
          billboardMode: 'face_camera',
          pixelsPerUnit: 16,
          tintColor: '#ffffff'
        };
        break;
      case 'visual_particle':
        newComp = {
          type: 'visual_particle',
          particleFileName: 'fire_embers.particle',
          emitterRate: 25,
          playOnStart: true
        };
        break;
      case 'collider':
        newComp = {
          type: 'collider',
          shape: 'box',
          size: [1, 1, 1],
          isTrigger: false,
          collisionTag: 'default'
        };
        break;
      case 'rigidbody':
        newComp = {
          type: 'rigidbody',
          bodyType: 'dynamic',
          mass: 10,
          gravityScale: 1.0,
          drag: 0.05,
          freezeRotation: [false, false, false]
        };
        break;
      case 'light':
        newComp = {
          type: 'light',
          lightType: 'point',
          color: '#f59e0b',
          intensity: 2.0,
          radius: 8.0,
          castShadows: true
        };
        break;
      case 'player_controller':
        newComp = {
          type: 'player_controller',
          genre: 'third_person_rpg',
          moveSpeed: 6.0,
          sprintMultiplier: 1.5,
          jumpImpulse: 10.0,
          cameraDistance: 5.0,
          cameraSmoothing: 0.1
        };
        break;
      case 'fray_combatant':
        newComp = {
          type: 'fray_combatant',
          loadout: {
            assignedFocusSlots: {
              primaryStance: 'focus_kinetic',
              offhandChannel: 'focus_thermal',
              aegisWard: 'focus_aegis'
            },
            insigniaId: 'insignia_vanguard',
            currentValorPoints: 50,
            overdriveActive: false,
            currentActionPoints: 100,
            maxActionPoints: 100
          }
        };
        break;
      case 'interactable_trigger':
        newComp = {
          type: 'interactable_trigger',
          interactionRadius: 2.5,
          promptText: 'Interact with Object [E]',
          requireButtonPress: true
        };
        break;
      default:
        return;
    }

    handleUpdateCurrentObject(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
  };

  const handleRemoveComponent = (index: number) => {
    handleUpdateCurrentObject(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const handleSimulateGraph = () => {
    setIsSimulating(true);
    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleTimeString()}] Triggering Logic Graph for "${currentObject.name}"...`);

    const nodes = currentObject.logicGraph.nodes;
    const startNode = nodes.find(n => n.category === 'event') || nodes[0];

    if (startNode) {
      logs.push(`• Event Fired: [${startNode.name}]`);

      // Walk edges
      const nextEdges = currentObject.logicGraph.edges.filter(e => e.fromNodeId === startNode.id);
      nextEdges.forEach(e => {
        const targetNode = nodes.find(n => n.id === e.toNodeId);
        if (targetNode) {
          logs.push(`↳ Evaluated: [${targetNode.name}]`);
          if (targetNode.type === 'cond_ap_check') {
            logs.push(`  ✓ Condition Met: Current AP (100) >= 25. Route: TRUE`);
          }
          if (targetNode.type === 'act_spend_ap') {
            logs.push(`  ⚡ AP Spent: -25 AP (Remaining: 75 AP). Kinetic Stance Activated.`);
          }
          if (targetNode.type === 'act_gain_valor') {
            logs.push(`  🔥 Valor Momentum: +15 VP Added. (Current: 80 VP - OVERDRIVE READY!)`);
          }
        }
      });
    } else {
      logs.push(`• No event nodes found in graph.`);
    }

    logs.push(`[Simulation Complete] All logic functions evaluated successfully.`);
    setSimulationLog(logs);
    setTimeout(() => setIsSimulating(false), 500);
  };

  // Find if current object has Fray Combatant component
  const frayComponent = currentObject.components.find(c => c.type === 'fray_combatant') as any;

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <header className="px-6 py-4 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">Objects Studio</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-md">
                ENTITY-COMPONENT-GRAPH
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Empty 3D Object + Attachable Components (3D/2D/Physics/Fray) + Visual Node Logic Graph
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateNewObject}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" /> New Empty Object
          </button>

          {onNavigateToSubScenes && (
            <button
              type="button"
              onClick={onNavigateToSubScenes}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" /> Place in Sub-Scenes
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Body: 3 Panes (Object Palette, Inspector / Component Stack, Logic Graph) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Object Definition Selector */}
        <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
          <div className="p-3.5 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-purple-400" />
              Object Library ({objects.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {objects.map(obj => {
              const isSelected = obj.id === selectedObjectId;
              const hasFray = obj.components.some(c => c.type === 'fray_combatant');

              return (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjectId(obj.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-purple-500/15 border-purple-500/60 text-white font-semibold'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-white truncate flex items-center gap-1.5">
                      {obj.name}
                      {hasFray && (
                        <span title="Has Fray Combatant Loadout" className="inline-flex items-center">
                          <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {obj.components.length} components | {obj.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center & Right Work Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
          {/* Sub-Tabs: Component Stack vs Logic Graph vs Fray Loadout */}
          <div className="px-6 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('components')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'components'
                    ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Components Stack ({currentObject.components.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logic_graph')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'logic_graph'
                    ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FileCode className="w-4 h-4" />
                Object Logic Graph & Functions ({currentObject.logicGraph.nodes.length} Nodes)
              </button>

              {frayComponent && (
                <button
                  type="button"
                  onClick={() => setActiveTab('fray_loadout')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'fray_loadout'
                      ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Fray Universe Matrix (9 Foci & Insignia)
                </button>
              )}
            </div>

            {/* Object Title in Top Bar */}
            <div className="flex items-center gap-2 py-2">
              <input
                type="text"
                value={currentObject.name}
                onChange={e =>
                  handleUpdateCurrentObject(prev => ({ ...prev, name: e.target.value }))
                }
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
              />
            </div>
          </div>

          {/* TAB 1: COMPONENTS STACK */}
          {activeTab === 'components' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
              {/* Base Empty Object 3D Transform */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Base Empty 3D Object Transform
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">Origin Anchor</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-neutral-500 block mb-1">Base Position (X, Y, Z)</span>
                    <span className="font-mono text-white">[{currentObject.baseTransform.position.join(', ')}]</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-neutral-500 block mb-1">Base Rotation (rX, rY, rZ)</span>
                    <span className="font-mono text-white">[{currentObject.baseTransform.rotation.join(', ')}]°</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-neutral-500 block mb-1">Base Scale (sX, sY, sZ)</span>
                    <span className="font-mono text-white">[{currentObject.baseTransform.scale.join(', ')}]</span>
                  </div>
                </div>
              </div>

              {/* Add Component Action Bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Attached Components Stack
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">Attach Component:</span>
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        handleAddComponent(e.target.value as ComponentType);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-medium"
                  >
                    <option value="" disabled>+ Add Component...</option>
                    <option value="visual_mesh">3D Mesh (Low-Poly Primitive / .model3d)</option>
                    <option value="visual_sprite">2D Sprite (Billboard / Facing Camera)</option>
                    <option value="visual_particle">Particle Emitter (.particle FX)</option>
                    <option value="collider">Solid Collider (Box / Sphere / Capsule)</option>
                    <option value="rigidbody">Rigidbody Physics (Mass / Gravity / Kinematic)</option>
                    <option value="light">Light Source (Point / Spot)</option>
                    <option value="player_controller">Player Controller (Genre Movement)</option>
                    <option value="fray_combatant">Fray Combatant (9 Foci & Insignia)</option>
                    <option value="interactable_trigger">Interactable Trigger Volume</option>
                  </select>
                </div>
              </div>

              {/* Component Cards */}
              <div className="space-y-4">
                {currentObject.components.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-neutral-800 text-center space-y-2 text-neutral-500">
                    <Box className="w-8 h-8 mx-auto text-neutral-600" />
                    <p className="text-xs">Empty Object with no components attached.</p>
                    <p className="text-[11px] text-neutral-600">Use the dropdown above to attach a 3D Mesh, Sprite, Collider, or Fray Combatant.</p>
                  </div>
                ) : (
                  currentObject.components.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded">
                            {comp.type.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-white capitalize">
                            {comp.type.replace('_', ' ')} Component
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="p-1 hover:text-red-400 text-neutral-500 transition-colors"
                          title="Remove Component"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Component Properties */}
                      <div className="text-xs text-neutral-300">
                        {comp.type === 'visual_mesh' && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Mesh Geometry</span>
                              <span className="font-mono text-white">{comp.primitiveType || 'Custom 3D Mesh'}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Roughness</span>
                              <span className="font-mono text-white">{comp.roughness}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Metalness</span>
                              <span className="font-mono text-white">{comp.metalness}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Solid Early-Z</span>
                              <span className="font-mono text-emerald-400">100% Solid (0% Overdraw)</span>
                            </div>
                          </div>
                        )}

                        {comp.type === 'player_controller' && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Genre Mode</span>
                              <span className="font-mono text-white">{comp.genre}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Move Speed</span>
                              <span className="font-mono text-white">{comp.moveSpeed} m/s</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Jump Impulse</span>
                              <span className="font-mono text-white">{comp.jumpImpulse}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Camera Distance</span>
                              <span className="font-mono text-white">{comp.cameraDistance}m</span>
                            </div>
                          </div>
                        )}

                        {comp.type === 'fray_combatant' && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Primary Stance</span>
                              <span className="font-mono text-amber-400 font-bold">{comp.loadout.assignedFocusSlots.primaryStance}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Insignia Crest</span>
                              <span className="font-mono text-white">{comp.loadout.insigniaId}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Action Points</span>
                              <span className="font-mono text-cyan-400">{comp.loadout.currentActionPoints} / {comp.loadout.maxActionPoints} AP</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Valor Points</span>
                              <span className="font-mono text-amber-400">{comp.loadout.currentValorPoints} VP</span>
                            </div>
                          </div>
                        )}

                        {comp.type === 'collider' && (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Shape</span>
                              <span className="font-mono text-white">{comp.shape}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Dimensions</span>
                              <span className="font-mono text-white">[{comp.size.join(', ')}]</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Tag</span>
                              <span className="font-mono text-white">{comp.collisionTag}</span>
                            </div>
                          </div>
                        )}

                        {comp.type === 'rigidbody' && (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Body Type</span>
                              <span className="font-mono text-white">{comp.bodyType}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Mass</span>
                              <span className="font-mono text-white">{comp.mass} kg</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Gravity Scale</span>
                              <span className="font-mono text-white">{comp.gravityScale}x</span>
                            </div>
                          </div>
                        )}

                        {comp.type === 'light' && (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Type</span>
                              <span className="font-mono text-white">{comp.lightType}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Intensity</span>
                              <span className="font-mono text-white">{comp.intensity} cd</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Radius</span>
                              <span className="font-mono text-white">{comp.radius}m</span>
                            </div>
                          </div>
                        )}

                        {comp.type === 'interactable_trigger' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Interaction Prompt</span>
                              <span className="font-mono text-white">{comp.promptText}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 block text-[10px]">Radius</span>
                              <span className="font-mono text-white">{comp.interactionRadius}m</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LOGIC GRAPH & FUNCTIONS */}
          {activeTab === 'logic_graph' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Logic Graph Canvas Toolbar */}
              <div className="px-6 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-neutral-300">Object Logic Canvas</span>
                  <span className="text-neutral-600">|</span>
                  <span className="text-neutral-400">Events → Conditions → Actions</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateGraph}
                    disabled={isSimulating}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Simulate Logic Graph
                  </button>
                </div>
              </div>

              {/* Visual Node Graph Workspace */}
              <div className="flex-1 p-6 relative overflow-auto bg-neutral-950 flex flex-col justify-between">
                {/* Node Cards on Canvas */}
                <div className="flex items-center gap-6 overflow-x-auto pb-4">
                  {currentObject.logicGraph.nodes.map((node, i) => (
                    <div
                      key={node.id}
                      className="w-64 rounded-xl bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden shrink-0"
                    >
                      {/* Node Header */}
                      <div
                        className={`px-3 py-2 text-xs font-bold flex items-center justify-between ${
                          node.category === 'event'
                            ? 'bg-amber-500/20 text-amber-300 border-b border-amber-500/30'
                            : node.category === 'condition'
                            ? 'bg-blue-500/20 text-blue-300 border-b border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
                        }`}
                      >
                        <span className="truncate">{node.name}</span>
                        <span className="text-[9px] uppercase font-mono px-1 rounded bg-black/40">
                          {node.category}
                        </span>
                      </div>

                      {/* Node Body */}
                      <div className="p-3 space-y-2 text-[11px] text-neutral-300">
                        {node.inputs.length > 0 && (
                          <div className="space-y-1">
                            {node.inputs.map(inp => (
                              <div key={inp.id} className="flex items-center gap-1.5 text-neutral-400">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                                <span>{inp.label}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {node.outputs.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-neutral-800/60">
                            {node.outputs.map(out => (
                              <div key={out.id} className="flex items-center justify-end gap-1.5 text-neutral-400">
                                <span>{out.label}</span>
                                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Simulation Output Console */}
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      Execution Simulation Console
                    </span>
                    <button
                      type="button"
                      onClick={() => setSimulationLog([])}
                      className="text-[10px] text-neutral-500 hover:text-neutral-300"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="bg-neutral-950 rounded-lg p-3 font-mono text-[11px] text-neutral-300 space-y-1 max-h-32 overflow-y-auto">
                    {simulationLog.length === 0 ? (
                      <span className="text-neutral-600">Ready to simulate. Click "Simulate Logic Graph" above.</span>
                    ) : (
                      simulationLog.map((log, i) => (
                        <div key={i} className="leading-relaxed">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FRAY LOADOUT MATRIX (9 FOCI & INSIGNIA) */}
          {activeTab === 'fray_loadout' && frayComponent && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
              <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Fray Universe 9-Foci Matrix</h3>
                    <p className="text-xs text-neutral-400">Standardized focus stances attached to this combatant object</p>
                  </div>
                </div>

                {/* 9 Foci Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {DEFAULT_FRAY_FOCI_CATALOG.map(focus => {
                    const isEquipped = Object.values(frayComponent.loadout.assignedFocusSlots).includes(focus.id);

                    return (
                      <div
                        key={focus.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isEquipped
                            ? 'bg-amber-500/10 border-amber-500/50'
                            : 'bg-neutral-950 border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white">{focus.name}</h4>
                          <span className="text-[10px] font-mono text-cyan-400">{focus.actionPointCost} AP</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{focus.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
