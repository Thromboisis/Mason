import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shield,
  Layers,
  HardDrive,
  Sliders,
  Volume2,
  Play,
  RotateCcw,
  Sparkles,
  Compass,
  Box,
  CheckCircle2,
  ArrowRight,
  Globe,
  Radio,
  Plus,
  Trash2,
  Palette,
  Eye,
  Settings,
  Pause,
  Flame,
  Zap,
  Image as ImageIcon,
  Type,
  SquareMousePointer,
  ChevronRight,
  ChevronDown,
  Monitor,
  Maximize2,
  Grid,
  Magnet,
  Move,
  CornerDownRight,
  Scissors,
  Copy,
  RefreshCw
} from 'lucide-react';
import {
  MainSceneConfig,
  SubSceneDefinition,
  createDefaultMainSceneConfig,
  createDefaultSubScenes,
  DefaultGuiId,
  GuiWidget,
  GuiWidgetType,
  GuiActionType,
  GuiScreenDefinition,
  GuiThemeConfig,
  PRESET_GUI_THEMES,
  GuiOrnamentalBorderConfig,
  createDefaultModularBorderConfig,
  createDefaultGuiScreens,
  AAA_BORDER_PRESETS
} from '../../engine/sceneObjectSchema';
import { MasonProject } from '../../engine/masonProjectSchema';
import { ModularOrnamentalBorder } from './ModularOrnamentalBorder';

const GRID_COLS = 24;
const GRID_ROWS = 16;

interface MainSceneModuleProps {
  project?: MasonProject;
  onUpdateProject?: (updated: MasonProject | ((prev: MasonProject) => MasonProject)) => void;
  onNavigateToSubScene?: (subSceneId: string) => void;
  onNavigateToObjects?: (objectId?: string) => void;
}

export const MainSceneModule: React.FC<MainSceneModuleProps> = ({
  project,
  onNavigateToSubScene,
  onNavigateToObjects
}) => {
  const [config, setConfig] = useState<MainSceneConfig>(createDefaultMainSceneConfig());
  const [subScenes] = useState<SubSceneDefinition[]>(createDefaultSubScenes());
  
  // GUI & View State
  const [activeGuiId, setActiveGuiId] = useState<DefaultGuiId>('start_menu');
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'guis' | 'theme' | 'widget_edit' | 'custom_border'>('guis');
  const [previewMode, setPreviewMode] = useState<'authoring' | 'live_interactive'>('authoring');
  const [runtimeStatusMessage, setRuntimeStatusMessage] = useState<string | null>(null);
  const [canvasResolution, setCanvasResolution] = useState<'1080p' | '720p' | 'ultrawide'>('1080p');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Grid Controls
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Dragging & Resizing State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    widgetId: string;
    mode: 'move' | 'resize';
    startMouseX: number;
    startMouseY: number;
    initialGridX: number;
    initialGridY: number;
    initialGridW: number;
    initialGridH: number;
  } | null>(null);

  // Active Screen and Theme
  const activeScreen = config.guiScreens.find(s => s.id === activeGuiId) || config.guiScreens[0];
  const activeTheme = config.guiTheme || PRESET_GUI_THEMES[0];
  const selectedWidget = activeScreen?.widgets.find(w => w.id === selectedWidgetId) || null;

  // Active SubScene for continuity
  const activeSubScene = subScenes.find(s => s.id === config.orchestrator.activeSubSceneId) || subScenes[0];

  // Helper to update active GUI screen widgets
  const handleUpdateCurrentScreen = useCallback((updatedWidgets: GuiWidget[]) => {
    setConfig(prev => ({
      ...prev,
      guiScreens: prev.guiScreens.map(scr =>
        scr.id === activeGuiId ? { ...scr, widgets: updatedWidgets } : scr
      )
    }));
  }, [activeGuiId]);

  // Helper to update an individual widget
  const handleUpdateWidget = useCallback((widgetId: string, updates: Partial<GuiWidget>) => {
    handleUpdateCurrentScreen(
      activeScreen.widgets.map(w => (w.id === widgetId ? { ...w, ...updates } : w))
    );
  }, [activeScreen.widgets, handleUpdateCurrentScreen]);

  // Helper to add a new widget to the active GUI
  const handleAddWidget = (type: GuiWidgetType) => {
    const newId = `widget_${type}_${Date.now().toString(36)}`;
    let newWidget: GuiWidget;

    // Place near center on grid
    const targetX = 6;
    const targetY = 6;

    switch (type) {
      case 'button':
        newWidget = {
          id: newId,
          type: 'button',
          name: `Custom Button ${activeScreen.widgets.length + 1}`,
          label: 'INTERACT',
          secondaryText: 'Perform action trigger',
          buttonVariant: 'primary',
          icon: 'Play',
          gridX: targetX,
          gridY: targetY,
          gridWidth: 10,
          gridHeight: 2,
          customBorder: createDefaultModularBorderConfig('sovereign_gold'),
          action: {
            type: 'open_gui',
            targetGuiId: 'settings_menu',
            label: 'Navigate to Settings'
          }
        };
        break;
      case 'text':
        newWidget = {
          id: newId,
          type: 'text',
          name: `Text Banner ${activeScreen.widgets.length + 1}`,
          label: 'Enter Headline Text Here',
          fontSize: 'xl',
          fontWeight: 'bold',
          fontFamily: activeTheme.fontFamily,
          textAlign: 'center',
          gridX: targetX,
          gridY: targetY,
          gridWidth: 12,
          gridHeight: 2,
          customBorder: createDefaultModularBorderConfig('sovereign_gold')
        };
        break;
      case 'image':
        newWidget = {
          id: newId,
          type: 'image',
          name: `Image Frame ${activeScreen.widgets.length + 1}`,
          imageUrl: '',
          imageAlt: 'Custom Graphic / Emblem',
          gridX: 9,
          gridY: 5,
          gridWidth: 6,
          gridHeight: 4,
          customBorder: createDefaultModularBorderConfig('sovereign_gold')
        };
        break;
      case 'slider':
        newWidget = {
          id: newId,
          type: 'slider',
          name: `Slider ${activeScreen.widgets.length + 1}`,
          gridX: 4,
          gridY: 7,
          gridWidth: 16,
          gridHeight: 2,
          sliderConfig: {
            settingKey: `custom_setting_${Date.now()}`,
            label: 'Custom Calibration Slider',
            min: 0,
            max: 100,
            value: 50,
            step: 5,
            unit: '%'
          }
        };
        break;
      case 'hud_gauge':
        newWidget = {
          id: newId,
          type: 'hud_gauge',
          name: `Combat Meter ${activeScreen.widgets.length + 1}`,
          gridX: 1,
          gridY: 5,
          gridWidth: 7,
          gridHeight: 2,
          hudGaugeConfig: {
            gaugeType: 'health',
            label: 'SHIELD BARRIER (SP)',
            currentValue: 450,
            maxValue: 500,
            barColor: activeTheme.primaryAccent,
            subBarColor: activeTheme.secondaryAccent
          },
          customBorder: createDefaultModularBorderConfig('cyber_brackets')
        };
        break;
      default:
        newWidget = {
          id: newId,
          type: 'button',
          name: 'Button',
          label: 'NEW BUTTON',
          gridX: targetX,
          gridY: targetY,
          gridWidth: 8,
          gridHeight: 2,
          action: { type: 'open_gui', targetGuiId: 'start_menu' }
        };
    }

    const updated = [...activeScreen.widgets, newWidget];
    handleUpdateCurrentScreen(updated);
    setSelectedWidgetId(newId);
    setLeftSidebarTab('widget_edit');
  };

  // Helper to delete a widget
  const handleDeleteWidget = (widgetId: string) => {
    const updated = activeScreen.widgets.filter(w => w.id !== widgetId);
    handleUpdateCurrentScreen(updated);
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
      setLeftSidebarTab('guis');
    }
  };

  // Helper to reorder widgets
  const handleMoveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const index = activeScreen.widgets.findIndex(w => w.id === widgetId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeScreen.widgets.length) return;

    const copy = [...activeScreen.widgets];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    handleUpdateCurrentScreen(copy);
  };

  // Reset current screen widgets to default layout
  const handleResetScreenLayout = () => {
    const defaultScreens = createDefaultGuiScreens();
    const match = defaultScreens.find(s => s.id === activeGuiId);
    if (match) {
      handleUpdateCurrentScreen(match.widgets);
      setRuntimeStatusMessage(`Reset ${match.name} to default grid layout!`);
      setTimeout(() => setRuntimeStatusMessage(null), 2500);
    }
  };

  // Live Interactive Action Trigger
  const handleExecuteWidgetAction = (widget: GuiWidget) => {
    if (!widget.action) return;
    const { type, targetGuiId, targetSubSceneId, slotNumber } = widget.action;

    switch (type) {
      case 'open_gui':
        if (targetGuiId) {
          setIsTransitioning(true);
          setTimeout(() => {
            setActiveGuiId(targetGuiId);
            setIsTransitioning(false);
            setRuntimeStatusMessage(`Navigated to GUI: ${targetGuiId}`);
          }, 200);
        }
        break;

      case 'start_game':
        setIsTransitioning(true);
        setRuntimeStatusMessage(`Loading Sub-Scene [${targetSubSceneId || activeSubScene.name}] into 3D Coordinate Space...`);
        setTimeout(() => {
          setConfig(prev => ({
            ...prev,
            orchestrator: {
              ...prev.orchestrator,
              isSubSceneLoaded: true,
              activeSubSceneId: targetSubSceneId || prev.orchestrator.activeSubSceneId
            }
          }));
          setActiveGuiId('in_game_hud');
          setIsTransitioning(false);
          setRuntimeStatusMessage(`Sub-Scene loaded! In Game HUD active.`);
        }, 500);
        break;

      case 'resume_game':
        setIsTransitioning(true);
        setTimeout(() => {
          setActiveGuiId('in_game_hud');
          setIsTransitioning(false);
          setRuntimeStatusMessage(`Game Resumed. Combat HUD overlay restored.`);
        }, 150);
        break;

      case 'open_pause_menu':
        setActiveGuiId('in_game_pause_menu');
        setRuntimeStatusMessage(`Game paused. Tactical menu active.`);
        break;

      case 'quit_to_title':
        setIsTransitioning(true);
        setTimeout(() => {
          setConfig(prev => ({
            ...prev,
            orchestrator: { ...prev.orchestrator, isSubSceneLoaded: false }
          }));
          setActiveGuiId('start_menu');
          setIsTransitioning(false);
          setRuntimeStatusMessage(`Sub-scene unloaded. Returned to Start Menu.`);
        }, 300);
        break;

      case 'save_slot':
        setRuntimeStatusMessage(`Saved game state to Slot ${slotNumber || 1}!`);
        break;

      case 'load_slot':
        setIsTransitioning(true);
        setTimeout(() => {
          setConfig(prev => ({
            ...prev,
            orchestrator: { ...prev.orchestrator, isSubSceneLoaded: true }
          }));
          setActiveGuiId('in_game_hud');
          setIsTransitioning(false);
          setRuntimeStatusMessage(`Loaded save state from Slot ${slotNumber || 1}!`);
        }, 350);
        break;

      default:
        setRuntimeStatusMessage(`Executed action: ${type}`);
    }

    setTimeout(() => {
      setRuntimeStatusMessage(null);
    }, 3500);
  };

  // Helper to switch Theme
  const handleApplyThemePreset = (theme: GuiThemeConfig) => {
    setConfig(prev => ({
      ...prev,
      guiTheme: theme
    }));
  };

  // Custom Theme field updater
  const handleUpdateCustomTheme = (updates: Partial<GuiThemeConfig>) => {
    setConfig(prev => ({
      ...prev,
      guiTheme: {
        ...prev.guiTheme,
        ...updates
      }
    }));
  };

  // Custom Border field updater for selected widget
  const handleUpdateSelectedBorder = (updates: Partial<GuiOrnamentalBorderConfig>) => {
    if (!selectedWidget) return;
    const currentBorder = selectedWidget.customBorder || createDefaultModularBorderConfig('sovereign_gold');
    handleUpdateWidget(selectedWidget.id, {
      customBorder: {
        ...currentBorder,
        ...updates
      }
    });
  };

  // Apply a modular border preset to selected widget
  const handleApplyBorderPreset = (presetKey: string) => {
    if (!selectedWidget) return;
    const presetConfig = createDefaultModularBorderConfig(presetKey);
    handleUpdateWidget(selectedWidget.id, {
      customBorder: presetConfig
    });
  };

  // ==========================================
  // DRAG & RESIZE ENGINE
  // ==========================================

  const handleStartDrag = (e: React.MouseEvent, widget: GuiWidget, mode: 'move' | 'resize') => {
    if (previewMode !== 'authoring') return;
    e.stopPropagation();
    e.preventDefault();

    setSelectedWidgetId(widget.id);

    setDragState({
      widgetId: widget.id,
      mode,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialGridX: widget.gridX,
      initialGridY: widget.gridY,
      initialGridW: widget.gridWidth,
      initialGridH: widget.gridHeight
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !dragState) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cellWidth = rect.width / GRID_COLS;
      const cellHeight = rect.height / GRID_ROWS;

      const deltaX = e.clientX - dragState.startMouseX;
      const deltaY = e.clientY - dragState.startMouseY;

      const deltaGridCols = Math.round(deltaX / cellWidth);
      const deltaGridRows = Math.round(deltaY / cellHeight);

      if (dragState.mode === 'move') {
        const rawNewX = dragState.initialGridX + deltaGridCols;
        const rawNewY = dragState.initialGridY + deltaGridRows;

        const maxCol = GRID_COLS - dragState.initialGridW;
        const maxRow = GRID_ROWS - dragState.initialGridH;

        const clampedX = Math.max(0, Math.min(maxCol, rawNewX));
        const clampedY = Math.max(0, Math.min(maxRow, rawNewY));

        handleUpdateWidget(dragState.widgetId, {
          gridX: clampedX,
          gridY: clampedY
        });
      } else if (dragState.mode === 'resize') {
        const rawNewW = dragState.initialGridW + deltaGridCols;
        const rawNewH = dragState.initialGridH + deltaGridRows;

        const clampedW = Math.max(2, Math.min(GRID_COLS - dragState.initialGridX, rawNewW));
        const clampedH = Math.max(1, Math.min(GRID_ROWS - dragState.initialGridY, rawNewH));

        handleUpdateWidget(dragState.widgetId, {
          gridWidth: clampedW,
          gridHeight: clampedH
        });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleUpdateWidget]);

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <header className="px-5 py-3.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">Main Scene</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                ROOT SCENE
              </span>
              <span className="text-xs text-neutral-400 hidden sm:inline">•</span>
              <span className="text-xs text-neutral-300 hidden sm:inline font-mono">
                24x16 Grid Architecture
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Drag-and-Drop GUI Layout & AAA Modular Ornamental Borders (Rotated & Custom Slices)
            </p>
          </div>
        </div>

        {/* Header Actions & Mode Switcher */}
        <div className="flex items-center gap-3">
          {/* Sub-Scene Orchestrator Continuity Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            <Radio className={`w-3.5 h-3.5 ${config.orchestrator.isSubSceneLoaded ? 'text-cyan-400 animate-pulse' : 'text-neutral-500'}`} />
            <span className="text-neutral-400 font-mono text-[11px]">Sub-Scene:</span>
            <span className="font-semibold text-white text-[11px] truncate max-w-[130px]">
              {activeSubScene.name}
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
              config.orchestrator.isSubSceneLoaded ? 'bg-cyan-500/20 text-cyan-300' : 'bg-neutral-800 text-neutral-400'
            }`}>
              {config.orchestrator.isSubSceneLoaded ? 'LOADED' : 'UNLOADED'}
            </span>
          </div>

          {/* Authoring vs Interactive Simulation Mode */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setPreviewMode('authoring')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                previewMode === 'authoring'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Authoring (Drag)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewMode('live_interactive');
                setSelectedWidgetId(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                previewMode === 'live_interactive'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Interactive Test</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN WORKSPACE: LEFT (DEFAULT GUIs & THEME & BORDERS) | RIGHT (DRAGGABLE GRID CANVAS) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: DEFAULT GUIS LIST & STYLING CONTROLS */}
        <aside className="w-80 md:w-88 border-r border-neutral-800 bg-neutral-900/95 flex flex-col shrink-0 overflow-hidden z-10">
          {/* Sub-Tabs: GUIs List | Theme Options | Widget Inspector | Custom Border */}
          <div className="p-2 border-b border-neutral-800 grid grid-cols-4 gap-1 bg-neutral-950/60 text-[11px]">
            <button
              type="button"
              onClick={() => setLeftSidebarTab('guis')}
              className={`px-1.5 py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                leftSidebarTab === 'guis'
                  ? 'bg-neutral-800 text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>GUIs</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftSidebarTab('theme')}
              className={`px-1.5 py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                leftSidebarTab === 'theme'
                  ? 'bg-neutral-800 text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>Theme</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftSidebarTab('widget_edit')}
              className={`px-1.5 py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                leftSidebarTab === 'widget_edit'
                  ? 'bg-neutral-800 text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Widgets</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftSidebarTab('custom_border')}
              className={`px-1.5 py-1.5 font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                leftSidebarTab === 'custom_border'
                  ? 'bg-neutral-800 text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Borders</span>
            </button>
          </div>

          {/* TAB 1: DEFAULT GUIs LIST */}
          {leftSidebarTab === 'guis' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/50">
                <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                  Default Core GUIs ({config.guiScreens.length})
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Select a GUI screen to drag its widgets on the grid.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {config.guiScreens.map((scr) => {
                  const isActive = scr.id === activeGuiId;
                  const getScreenIcon = (id: DefaultGuiId) => {
                    switch (id) {
                      case 'splash_screen': return <Sparkles className="w-4 h-4" />;
                      case 'start_menu': return <Play className="w-4 h-4" />;
                      case 'settings_menu': return <Sliders className="w-4 h-4" />;
                      case 'in_game_hud': return <Shield className="w-4 h-4" />;
                      case 'in_game_pause_menu': return <Pause className="w-4 h-4" />;
                      case 'save_load_menu': return <HardDrive className="w-4 h-4" />;
                      default: return <Monitor className="w-4 h-4" />;
                    }
                  };

                  return (
                    <div
                      key={scr.id}
                      onClick={() => {
                        setActiveGuiId(scr.id);
                        setSelectedWidgetId(null);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start gap-3 ${
                        isActive
                          ? 'border-amber-500/80 bg-amber-500/10 shadow-md ring-1 ring-amber-500/30'
                          : 'border-neutral-800/90 bg-neutral-950/40 hover:bg-neutral-800/60 hover:border-neutral-700'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                          isActive
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 scale-105'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 group-hover:text-neutral-200'
                        }`}
                      >
                        {getScreenIcon(scr.id)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-bold truncate ${isActive ? 'text-amber-300' : 'text-neutral-200'}`}>
                            {scr.name}
                          </h4>
                          <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                            {scr.widgets.length} items
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {scr.subtitle}
                        </p>
                      </div>

                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isActive ? 'text-amber-400 translate-x-0.5' : 'text-neutral-600 group-hover:text-neutral-400'
                      }`} />
                    </div>
                  );
                })}
              </div>

              {/* Quick Screen Meta Footer */}
              <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="font-semibold text-neutral-300">{activeScreen.name}</span>
                  <button
                    type="button"
                    onClick={handleResetScreenLayout}
                    className="text-[10px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 font-mono transition"
                    title="Reset to default 24x16 layout"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Reset Layout</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setLeftSidebarTab('widget_edit')}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configure {activeScreen.name} Widgets</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: THEME & STYLING OPTIONS */}
          {leftSidebarTab === 'theme' && (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Theme Presets</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-500">5 styles</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Global styling applied dynamically to all buttons, borders, and cards.
                </p>

                <div className="mt-3 space-y-2">
                  {PRESET_GUI_THEMES.map(preset => {
                    const isSelected = activeTheme.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleApplyThemePreset(preset)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/40'
                            : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: preset.primaryAccent }}
                            />
                            <h4 className="text-xs font-bold text-neutral-200">{preset.name}</h4>
                          </div>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                          {preset.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Theme Color & Border Calibration */}
              <div className="border-t border-neutral-800 pt-4 space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Border & Button Styling
                </h3>

                {/* Primary Accent Color */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-neutral-400 flex items-center justify-between">
                    <span>Primary Accent Color</span>
                    <span className="font-mono text-amber-400">{activeTheme.primaryAccent}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTheme.primaryAccent}
                      onChange={e => handleUpdateCustomTheme({ primaryAccent: e.target.value })}
                      className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activeTheme.primaryAccent}
                      onChange={e => handleUpdateCustomTheme({ primaryAccent: e.target.value })}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Border Color */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-neutral-400 flex items-center justify-between">
                    <span>Border Color</span>
                    <span className="font-mono text-neutral-300">{activeTheme.borderColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTheme.borderColor}
                      onChange={e => handleUpdateCustomTheme({ borderColor: e.target.value })}
                      className="w-8 h-8 rounded border border-neutral-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activeTheme.borderColor}
                      onChange={e => handleUpdateCustomTheme({ borderColor: e.target.value })}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Border Width */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-neutral-400">Border Width</label>
                    <span className="font-mono text-amber-400">{activeTheme.borderWidthPx} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="0.5"
                    value={activeTheme.borderWidthPx}
                    onChange={e => handleUpdateCustomTheme({ borderWidthPx: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Border Radius */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-neutral-400">Border Radius (Corners)</label>
                    <span className="font-mono text-amber-400">{activeTheme.borderRadiusPx} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={activeTheme.borderRadiusPx}
                    onChange={e => handleUpdateCustomTheme({
                      borderRadiusPx: parseInt(e.target.value, 10),
                      buttonBorderRadiusPx: Math.max(2, parseInt(e.target.value, 10) - 2)
                    })}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Typography Style */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-neutral-400">Font Family Style</label>
                  <select
                    value={activeTheme.fontFamily}
                    onChange={e => handleUpdateCustomTheme({ fontFamily: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="cinematic_serif">Cinematic Serif (Fray Universe Saga)</option>
                    <option value="modern_sans">Modern Sans (Clean & Crisp)</option>
                    <option value="tactical_mono">Tactical Monospace (Engine Terminal)</option>
                    <option value="cyber_display">Cyber Display (Neon Futuristic)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WIDGETS MANAGER & POSITIONING */}
          {leftSidebarTab === 'widget_edit' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header with Quick Add Element */}
              <div className="p-3 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {activeScreen.name}
                  </h3>
                  <span className="text-[10px] text-neutral-400">
                    {activeScreen.widgets.length} elements placed
                  </span>
                </div>

                {/* Add Element Quick Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddWidget('button')}
                    title="Add Button"
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded-lg transition"
                  >
                    <SquareMousePointer className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddWidget('text')}
                    title="Add Text Box"
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 rounded-lg transition"
                  >
                    <Type className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddWidget('image')}
                    title="Add Image"
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-purple-400 rounded-lg transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddWidget('slider')}
                    title="Add Slider"
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 rounded-lg transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Elements Stack List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeScreen.widgets.map((widget, idx) => {
                  const isSelected = widget.id === selectedWidgetId;

                  return (
                    <div
                      key={widget.id}
                      onClick={() => setSelectedWidgetId(widget.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/30'
                          : 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            widget.type === 'button'
                              ? 'bg-amber-500/20 text-amber-300'
                              : widget.type === 'text'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : widget.type === 'image'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {widget.type}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {widget.name || widget.label}
                          </span>
                        </div>

                        {/* Reorder and Delete */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleMoveWidget(widget.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-neutral-400 hover:text-white disabled:opacity-20"
                            title="Move Up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveWidget(widget.id, 'down')}
                            disabled={idx === activeScreen.widgets.length - 1}
                            className="p-1 text-neutral-400 hover:text-white disabled:opacity-20"
                            title="Move Down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWidget(widget.id)}
                            className="p-1 text-neutral-400 hover:text-red-400"
                            title="Delete Widget"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Grid Position Coordinates Tag */}
                      <div className="mt-1 text-[10px] font-mono text-neutral-400 flex items-center justify-between">
                        <span>Grid: X={widget.gridX}, Y={widget.gridY}</span>
                        <span>Size: {widget.gridWidth}x{widget.gridHeight}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Widget Property Inspector Panel */}
              {selectedWidget && (
                <div className="p-3 bg-neutral-950 border-t border-neutral-800 space-y-3 overflow-y-auto max-h-72 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-[10px] tracking-wide">
                      Edit {selectedWidget.type}: {selectedWidget.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLeftSidebarTab('custom_border')}
                      className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 font-semibold"
                    >
                      <Shield className="w-3 h-3" />
                      <span>Custom Border</span>
                    </button>
                  </div>

                  {/* Label Content */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-400">Label / Text</label>
                    <input
                      type="text"
                      value={selectedWidget.label || ''}
                      onChange={e => handleUpdateWidget(selectedWidget.id, { label: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Grid Manual Position Controls */}
                  <div className="grid grid-cols-4 gap-2 p-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                    <div>
                      <label className="text-[9px] text-neutral-400 font-mono">Col (X)</label>
                      <input
                        type="number"
                        min="0"
                        max={GRID_COLS - 1}
                        value={selectedWidget.gridX}
                        onChange={e => handleUpdateWidget(selectedWidget.id, { gridX: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-400 font-mono">Row (Y)</label>
                      <input
                        type="number"
                        min="0"
                        max={GRID_ROWS - 1}
                        value={selectedWidget.gridY}
                        onChange={e => handleUpdateWidget(selectedWidget.id, { gridY: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-400 font-mono">Width</label>
                      <input
                        type="number"
                        min="1"
                        max={GRID_COLS}
                        value={selectedWidget.gridWidth}
                        onChange={e => handleUpdateWidget(selectedWidget.id, { gridWidth: parseInt(e.target.value, 10) || 1 })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-400 font-mono">Height</label>
                      <input
                        type="number"
                        min="1"
                        max={GRID_ROWS}
                        value={selectedWidget.gridHeight}
                        onChange={e => handleUpdateWidget(selectedWidget.id, { gridHeight: parseInt(e.target.value, 10) || 1 })}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Button Action Selector */}
                  {selectedWidget.type === 'button' && (
                    <div className="space-y-2 p-2 rounded-lg bg-neutral-900/80 border border-neutral-800">
                      <div className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Button Trigger Action</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">Action Type</label>
                        <select
                          value={selectedWidget.action?.type || 'open_gui'}
                          onChange={e => handleUpdateWidget(selectedWidget.id, {
                            action: {
                              ...selectedWidget.action,
                              type: e.target.value as GuiActionType
                            }
                          })}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-white"
                        >
                          <option value="open_gui">Open GUI Screen</option>
                          <option value="start_game">Start Game (Load Sub-Scene in 3D Space)</option>
                          <option value="resume_game">Resume Game (Unpause)</option>
                          <option value="open_pause_menu">Open Pause Menu</option>
                          <option value="save_slot">Save Game Slot</option>
                          <option value="load_slot">Load Game Slot</option>
                          <option value="quit_to_title">Quit to Title / Start Menu</option>
                          <option value="toggle_audio">Toggle Audio Mute</option>
                        </select>
                      </div>

                      {/* If target is GUI screen */}
                      {selectedWidget.action?.type === 'open_gui' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-neutral-400">Target GUI</label>
                          <select
                            value={selectedWidget.action?.targetGuiId || 'start_menu'}
                            onChange={e => handleUpdateWidget(selectedWidget.id, {
                              action: {
                                ...selectedWidget.action,
                                type: 'open_gui',
                                targetGuiId: e.target.value as DefaultGuiId
                              }
                            })}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-amber-300"
                          >
                            <option value="splash_screen">Splash screen</option>
                            <option value="start_menu">Start Menu</option>
                            <option value="settings_menu">Settings Menu</option>
                            <option value="in_game_hud">In game HUD</option>
                            <option value="in_game_pause_menu">In game pause menu</option>
                            <option value="save_load_menu">save/load menu</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AAA MODULAR ORNAMENTAL BORDER INSPECTOR */}
          {leftSidebarTab === 'custom_border' && (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-5 text-xs">
              <div className="border-b border-neutral-800 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>AAA Modular Border</span>
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400">9-Slice Slices</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Custom corner images (rotated or individual) & repeating edge borders for authentic AAA UI polish.
                </p>
              </div>

              {selectedWidget ? (
                <div className="space-y-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-neutral-400">Active Element</span>
                      <h4 className="text-xs font-bold text-white truncate max-w-[160px]">
                        {selectedWidget.name || selectedWidget.label}
                      </h4>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-300">
                      <input
                        type="checkbox"
                        checked={!!selectedWidget.customBorder?.enabled}
                        onChange={e => handleUpdateSelectedBorder({ enabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span>Enable Border</span>
                    </label>
                  </div>

                  {/* Built-in Presets */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-400">
                      AAA Ornamental Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(AAA_BORDER_PRESETS).map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyBorderPreset(preset.id)}
                          className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                            selectedWidget.customBorder?.presetId === preset.id
                              ? 'border-amber-500 bg-amber-500/20 text-white'
                              : 'border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-[11px] truncate">{preset.name}</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: preset.tintColor }}
                            />
                          </div>
                          <span className="text-[9px] text-neutral-500 mt-1 font-mono">
                            {preset.cornerSizePx}px corners
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 1. CORNER IMAGES SETTINGS */}
                  <div className="space-y-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Corner Images</span>
                      </label>
                      <select
                        value={selectedWidget.customBorder?.corners?.mode || 'single_rotated'}
                        onChange={e => {
                          const mode = e.target.value as 'single_rotated' | 'individual_custom';
                          handleUpdateSelectedBorder({
                            corners: {
                              ...selectedWidget.customBorder!.corners,
                              mode
                            }
                          });
                        }}
                        className="bg-neutral-900 border border-neutral-700 text-[10px] rounded px-1.5 py-0.5 text-neutral-200"
                      >
                        <option value="single_rotated">Single Image (Rotated 0°,90°,180°,270°)</option>
                        <option value="individual_custom">Custom Image for Each Corner</option>
                      </select>
                    </div>

                    {/* Corner Sizing */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>Corner Size</span>
                          <span className="font-mono text-amber-400">
                            {selectedWidget.customBorder?.corners?.cornerSizePx || 32}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="16"
                          max="56"
                          step="2"
                          value={selectedWidget.customBorder?.corners?.cornerSizePx || 32}
                          onChange={e => {
                            const cornerSizePx = parseInt(e.target.value, 10);
                            handleUpdateSelectedBorder({
                              corners: {
                                ...selectedWidget.customBorder!.corners,
                                cornerSizePx
                              }
                            });
                          }}
                          className="w-full accent-amber-500 mt-1"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>Corner Offset</span>
                          <span className="font-mono text-amber-400">
                            {selectedWidget.customBorder?.corners?.cornerOffsetPx ?? -1}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-8"
                          max="8"
                          step="1"
                          value={selectedWidget.customBorder?.corners?.cornerOffsetPx ?? -1}
                          onChange={e => {
                            const cornerOffsetPx = parseInt(e.target.value, 10);
                            handleUpdateSelectedBorder({
                              corners: {
                                ...selectedWidget.customBorder!.corners,
                                cornerOffsetPx
                              }
                            });
                          }}
                          className="w-full accent-amber-500 mt-1"
                        />
                      </div>
                    </div>

                    {/* Corner Image Inputs */}
                    {selectedWidget.customBorder?.corners?.mode === 'single_rotated' ? (
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">
                          Master Corner Image URL (Auto-Rotated for all 4 corners)
                        </label>
                        <input
                          type="text"
                          value={selectedWidget.customBorder?.corners?.singleCornerImageUrl || ''}
                          onChange={e => {
                            handleUpdateSelectedBorder({
                              corners: {
                                ...selectedWidget.customBorder!.corners,
                                singleCornerImageUrl: e.target.value
                              }
                            });
                          }}
                          placeholder="Paste image URL / SVG data URI"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[10px] text-neutral-400 font-semibold">Individual 4 Corner URLs</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-neutral-500">Top-Left</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.corners?.topLeftImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  corners: {
                                    ...selectedWidget.customBorder!.corners,
                                    topLeftImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500">Top-Right</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.corners?.topRightImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  corners: {
                                    ...selectedWidget.customBorder!.corners,
                                    topRightImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500">Bottom-Left</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.corners?.bottomLeftImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  corners: {
                                    ...selectedWidget.customBorder!.corners,
                                    bottomLeftImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500">Bottom-Right</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.corners?.bottomRightImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  corners: {
                                    ...selectedWidget.customBorder!.corners,
                                    bottomRightImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. REPEATING EDGE BORDERS SETTINGS */}
                  <div className="space-y-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase text-cyan-400 flex items-center gap-1">
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Repeating Edges</span>
                      </label>
                      <select
                        value={selectedWidget.customBorder?.edges?.mode || 'single_rotated'}
                        onChange={e => {
                          const mode = e.target.value as 'single_rotated' | 'individual_custom';
                          handleUpdateSelectedBorder({
                            edges: {
                              ...selectedWidget.customBorder!.edges,
                              mode
                            }
                          });
                        }}
                        className="bg-neutral-900 border border-neutral-700 text-[10px] rounded px-1.5 py-0.5 text-neutral-200"
                      >
                        <option value="single_rotated">Single Image (Rotated for each side)</option>
                        <option value="individual_custom">Custom Repeating Image for Each Side</option>
                      </select>
                    </div>

                    {/* Edge Thickness & Repeat */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>Thickness</span>
                          <span className="font-mono text-cyan-400">
                            {selectedWidget.customBorder?.edges?.edgeThicknessPx || 8}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="20"
                          step="1"
                          value={selectedWidget.customBorder?.edges?.edgeThicknessPx || 8}
                          onChange={e => {
                            const edgeThicknessPx = parseInt(e.target.value, 10);
                            handleUpdateSelectedBorder({
                              edges: {
                                ...selectedWidget.customBorder!.edges,
                                edgeThicknessPx
                              }
                            });
                          }}
                          className="w-full accent-cyan-500 mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400">Tiling Mode</label>
                        <select
                          value={selectedWidget.customBorder?.edges?.repeatMode || 'repeat'}
                          onChange={e => {
                            handleUpdateSelectedBorder({
                              edges: {
                                ...selectedWidget.customBorder!.edges,
                                repeatMode: e.target.value as any
                              }
                            });
                          }}
                          className="w-full bg-neutral-900 border border-neutral-700 text-[10px] rounded px-1.5 py-1 text-neutral-200 mt-0.5"
                        >
                          <option value="repeat">Repeat (Seamless Tile)</option>
                          <option value="stretch">Stretch (Scale 100%)</option>
                        </select>
                      </div>
                    </div>

                    {/* Edge Image Inputs */}
                    {selectedWidget.customBorder?.edges?.mode === 'single_rotated' ? (
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">
                          Master Edge Image URL (Tiled & Rotated for all 4 sides)
                        </label>
                        <input
                          type="text"
                          value={selectedWidget.customBorder?.edges?.singleEdgeImageUrl || ''}
                          onChange={e => {
                            handleUpdateSelectedBorder({
                              edges: {
                                ...selectedWidget.customBorder!.edges,
                                singleEdgeImageUrl: e.target.value
                              }
                            });
                          }}
                          placeholder="Paste image URL / SVG data URI"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[10px] text-neutral-400 font-semibold">Individual 4 Edge URLs</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-neutral-500">Top Edge</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.edges?.topEdgeImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  edges: {
                                    ...selectedWidget.customBorder!.edges,
                                    topEdgeImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500">Right Edge</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.edges?.rightEdgeImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  edges: {
                                    ...selectedWidget.customBorder!.edges,
                                    rightEdgeImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500">Bottom Edge</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.edges?.bottomEdgeImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  edges: {
                                    ...selectedWidget.customBorder!.edges,
                                    bottomEdgeImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-neutral-500">Left Edge</span>
                            <input
                              type="text"
                              value={selectedWidget.customBorder?.edges?.leftEdgeImageUrl || ''}
                              onChange={e => {
                                handleUpdateSelectedBorder({
                                  edges: {
                                    ...selectedWidget.customBorder!.edges,
                                    leftEdgeImageUrl: e.target.value
                                  }
                                });
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500 space-y-2">
                  <Shield className="w-8 h-8 mx-auto opacity-40 text-amber-400" />
                  <p className="text-xs">Click any widget on the canvas to configure its AAA custom modular border.</p>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: 24x16 DRAGGABLE GRID CANVAS */}
        <main className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
          {/* Canvas Sub-Header Toolbar with Grid Controls */}
          <div className="px-6 py-2.5 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Active GUI:</span>
                <span className="text-amber-400 font-mono underline underline-offset-4">
                  {activeScreen.name}
                </span>
              </span>

              <span className="text-neutral-600">|</span>

              {/* Grid Snapping & Overlay Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowGridOverlay(!showGridOverlay)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border flex items-center gap-1.5 transition ${
                    showGridOverlay
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                  title="Toggle 24x16 grid overlay lines"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>24x16 Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border flex items-center gap-1.5 transition ${
                    snapToGrid
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                  title="Toggle snap-to-grid cells while dragging"
                >
                  <Magnet className="w-3.5 h-3.5" />
                  <span>Snap</span>
                </button>
              </div>
            </div>

            {/* Resolution simulator */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">Resolution:</span>
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setCanvasResolution('1080p')}
                  className={`px-2 py-0.5 rounded ${canvasResolution === '1080p' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'}`}
                >
                  16:9 (1080p)
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasResolution('ultrawide')}
                  className={`px-2 py-0.5 rounded ${canvasResolution === 'ultrawide' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'}`}
                >
                  21:9 Ultrawide
                </button>
              </div>
            </div>
          </div>

          {/* Runtime Feedback Toast Banner */}
          {runtimeStatusMessage && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <Zap className="w-4 h-4 fill-current" />
              <span>{runtimeStatusMessage}</span>
            </div>
          )}

          {/* Interactive Mode Banner */}
          {previewMode === 'live_interactive' && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-1.5 flex items-center justify-between text-xs text-amber-300 z-30">
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 fill-current animate-pulse text-amber-400" />
                <span><strong>Interactive Mode:</strong> Click buttons to trigger transitions, open submenus, or mount sub-scenes into 3D space!</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveGuiId('start_menu')}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 font-bold text-[10px] text-amber-200 border border-amber-500/30"
              >
                Reset to Start Menu
              </button>
            </div>
          )}

          {/* 24x16 DRAGGABLE VIEWPORT CANVAS */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900/60 to-neutral-950">
            <div
              ref={canvasRef}
              className={`relative rounded-2xl shadow-2xl overflow-hidden border transition-all duration-300 ${
                canvasResolution === 'ultrawide'
                  ? 'w-full max-w-5xl aspect-21/9'
                  : 'w-full max-w-4xl aspect-16/9'
              }`}
              style={{
                backgroundColor: activeTheme.backgroundColor,
                borderColor: activeTheme.borderColor,
                borderWidth: `${activeTheme.borderWidthPx}px`,
                boxShadow: activeTheme.borderGlow
                  ? `0 0 35px ${activeTheme.borderGlowColor || 'rgba(245, 158, 11, 0.2)'}`
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
              }}
            >
              {/* Optional 24x16 Grid Overlay Guides */}
              {showGridOverlay && previewMode === 'authoring' && (
                <div
                  className="absolute inset-0 pointer-events-none z-5 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(245, 158, 11, 0.3) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(245, 158, 11, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: `${100 / GRID_COLS}% ${100 / GRID_ROWS}%`
                  }}
                />
              )}

              {/* Backing Visual Layer: Wireframe grid for HUD, or Dark Vignette for Menus */}
              {activeGuiId === 'in_game_hud' ? (
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-neutral-950/80" />
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)`,
                      backgroundSize: '40px 40px',
                      transform: 'perspective(400px) rotateX(45deg) translateY(50px)'
                    }}
                  />
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-black/60 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
                    Active 3D Sub-Scene: {activeSubScene.name} • Origin [0, 0, 0]
                  </div>
                </div>
              ) : (
                <div
                  className="absolute inset-0 pointer-events-none opacity-50"
                  style={{
                    background: `radial-gradient(circle at center, transparent 30%, ${activeTheme.backgroundColor} 90%)`
                  }}
                />
              )}

              {/* DRAGGABLE WIDGETS RENDERER ON 24x16 GRID */}
              <div
                className={`relative z-10 w-full h-full transition-opacity duration-200 ${
                  isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`
                }}
              >
                {activeScreen.widgets.map((widget) => {
                  const isSelected = selectedWidgetId === widget.id;
                  const isDragging = dragState?.widgetId === widget.id;

                  // CSS Grid placement
                  const gridColumn = `${widget.gridX + 1} / span ${widget.gridWidth}`;
                  const gridRow = `${widget.gridY + 1} / span ${widget.gridHeight}`;

                  return (
                    <div
                      key={widget.id}
                      style={{
                        gridColumn,
                        gridRow,
                        zIndex: isSelected ? 30 : 10
                      }}
                      className={`relative group transition-all duration-75 flex flex-col justify-center ${
                        isSelected && previewMode === 'authoring'
                          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black/60 rounded-lg'
                          : ''
                      } ${isDragging ? 'opacity-85 shadow-2xl scale-[1.01]' : ''}`}
                      onClick={(e) => {
                        if (previewMode === 'authoring') {
                          e.stopPropagation();
                          setSelectedWidgetId(widget.id);
                          setLeftSidebarTab('widget_edit');
                        }
                      }}
                    >
                      {/* Authoring Mode Drag Grip Header */}
                      {previewMode === 'authoring' && (
                        <div
                          onMouseDown={(e) => handleStartDrag(e, widget, 'move')}
                          className="absolute -top-3 left-2 z-30 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[9px] font-mono font-bold text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-move flex items-center gap-1 shadow-md"
                        >
                          <Move className="w-2.5 h-2.5" />
                          <span>{widget.gridX},{widget.gridY}</span>
                        </div>
                      )}

                      {/* Authoring Mode Bottom-Right Resize Handle */}
                      {previewMode === 'authoring' && isSelected && (
                        <div
                          onMouseDown={(e) => handleStartDrag(e, widget, 'resize')}
                          className="absolute -bottom-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-amber-400 border border-black cursor-se-resize flex items-center justify-center shadow-md hover:scale-125 transition-transform"
                          title="Drag to resize columns and rows"
                        >
                          <CornerDownRight className="w-2.5 h-2.5 text-black" />
                        </div>
                      )}

                      {/* Modular Ornamental Border Wrapper */}
                      <ModularOrnamentalBorder
                        borderConfig={widget.customBorder}
                        className="w-full h-full flex flex-col justify-center"
                        contentClassName="flex flex-col justify-center h-full"
                      >
                        {/* WIDGET TYPE 1: BUTTON */}
                        {widget.type === 'button' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (previewMode === 'live_interactive') {
                                handleExecuteWidgetAction(widget);
                              }
                            }}
                            className={`w-full h-full px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                              previewMode === 'authoring' ? 'pointer-events-none' : 'hover:scale-[1.02]'
                            }`}
                            style={{
                              backgroundColor:
                                widget.buttonVariant === 'primary'
                                  ? activeTheme.primaryAccent
                                  : widget.buttonVariant === 'danger'
                                  ? '#7f1d1d'
                                  : widget.customBorder?.enabled
                                  ? 'transparent'
                                  : activeTheme.cardBackground,
                              color:
                                widget.buttonVariant === 'primary'
                                  ? '#000000'
                                  : activeTheme.textColor,
                              borderColor: widget.customBorder?.enabled ? 'transparent' : activeTheme.borderColor,
                              borderWidth: widget.customBorder?.enabled ? 0 : `${activeTheme.borderWidthPx}px`,
                              borderRadius: `${activeTheme.buttonBorderRadiusPx}px`,
                              boxShadow:
                                widget.buttonVariant === 'primary' && activeTheme.borderGlow
                                  ? `0 0 20px ${activeTheme.primaryAccent}40`
                                  : undefined
                            }}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {widget.icon === 'Play' && <Play className="w-4 h-4 fill-current shrink-0" />}
                              {widget.icon === 'HardDrive' && <HardDrive className="w-4 h-4 shrink-0" />}
                              {widget.icon === 'Sliders' && <Sliders className="w-4 h-4 shrink-0" />}
                              {widget.icon === 'RotateCcw' && <RotateCcw className="w-4 h-4 shrink-0" />}
                              {widget.icon === 'ArrowRight' && <ArrowRight className="w-4 h-4 shrink-0" />}
                              <span className="truncate">{widget.label}</span>
                            </div>

                            {widget.secondaryText && (
                              <span className="text-[10px] opacity-60 font-normal lowercase ml-2 truncate hidden sm:inline">
                                {widget.secondaryText}
                              </span>
                            )}
                          </button>
                        )}

                        {/* WIDGET TYPE 2: TEXT */}
                        {widget.type === 'text' && (
                          <div
                            className={`w-full text-${widget.textAlign || 'center'} flex flex-col justify-center`}
                            style={{
                              fontFamily: activeTheme.fontFamily === 'cinematic_serif' ? 'serif' : 'sans-serif'
                            }}
                          >
                            <h2
                              className={`${
                                widget.fontSize === '4xl'
                                  ? 'text-2xl md:text-3xl'
                                  : widget.fontSize === '3xl'
                                  ? 'text-xl md:text-2xl'
                                  : widget.fontSize === '2xl'
                                  ? 'text-lg md:text-xl'
                                  : widget.fontSize === 'xl'
                                  ? 'text-base font-bold'
                                  : 'text-xs'
                              } font-black tracking-tight leading-tight`}
                              style={{
                                color: widget.textColor || activeTheme.textColor
                              }}
                            >
                              {widget.label}
                            </h2>
                          </div>
                        )}

                        {/* WIDGET TYPE 3: IMAGE / CREST */}
                        {widget.type === 'image' && (
                          <div className="w-full h-full flex items-center justify-center">
                            {widget.imageUrl ? (
                              <img
                                src={widget.imageUrl}
                                alt={widget.imageAlt || 'GUI Graphic'}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex flex-col items-center justify-center p-2 rounded-xl"
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                  color: activeTheme.primaryAccent
                                }}
                              >
                                <Shield className="w-8 h-8" />
                                <span className="text-[9px] font-mono mt-1 font-bold">EMBLEM</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* WIDGET TYPE 4: SLIDER */}
                        {widget.type === 'slider' && widget.sliderConfig && (
                          <div className="w-full p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-neutral-200 text-[11px] truncate">
                                {widget.sliderConfig.label}
                              </span>
                              <span className="font-mono text-amber-400 font-bold text-[10px]">
                                {widget.sliderConfig.value} {widget.sliderConfig.unit}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={widget.sliderConfig.min}
                              max={widget.sliderConfig.max}
                              step={widget.sliderConfig.step}
                              value={widget.sliderConfig.value}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleUpdateWidget(widget.id, {
                                  sliderConfig: { ...widget.sliderConfig!, value: val }
                                });
                              }}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* WIDGET TYPE 5: HUD GAUGE */}
                        {widget.type === 'hud_gauge' && widget.hudGaugeConfig && (
                          <div className="w-full h-full p-2 rounded-xl backdrop-blur-md flex flex-col justify-center">
                            {widget.hudGaugeConfig.gaugeType === 'foci' ? (
                              <div>
                                <div className="text-[10px] font-mono font-bold text-amber-400 mb-1 flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  <span className="truncate">{widget.hudGaugeConfig.label}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                  {['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09'].map((foci, i) => (
                                    <div
                                      key={foci}
                                      className={`text-center py-0.5 rounded text-[8px] font-mono font-bold border ${
                                        i === 0
                                          ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 ring-1 ring-amber-400'
                                          : 'bg-neutral-900/60 text-neutral-400 border-neutral-800'
                                      }`}
                                    >
                                      {foci}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex justify-between text-[10px] font-mono font-bold mb-1 text-white">
                                  <span className="truncate">{widget.hudGaugeConfig.label}</span>
                                  <span>{widget.hudGaugeConfig.currentValue}/{widget.hudGaugeConfig.maxValue}</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden border border-white/10">
                                  <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.round((widget.hudGaugeConfig.currentValue / widget.hudGaugeConfig.maxValue) * 100)}%`,
                                      backgroundColor: widget.hudGaugeConfig.barColor || activeTheme.primaryAccent
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* WIDGET TYPE 6: SAVE SLOT CARD */}
                        {widget.type === 'save_slot_card' && widget.saveSlotConfig && (
                          <div className="w-full h-full p-3 rounded-xl flex items-center justify-between">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-white truncate">
                                  {widget.saveSlotConfig.slotTitle}
                                </h4>
                                <span className="text-[10px] font-mono text-amber-400 shrink-0">
                                  {widget.saveSlotConfig.subSceneName}
                                </span>
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-2">
                                <span>Playtime: {widget.saveSlotConfig.playtime}</span>
                                <span>•</span>
                                <span>{widget.saveSlotConfig.timestamp}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (previewMode === 'live_interactive') {
                                    setRuntimeStatusMessage(`Saved to Slot ${widget.saveSlotConfig?.slotNumber}!`);
                                  }
                                }}
                                className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (previewMode === 'live_interactive') {
                                    handleExecuteWidgetAction({
                                      id: 'load_action',
                                      type: 'button',
                                      name: 'Load',
                                      gridX: 0,
                                      gridY: 0,
                                      gridWidth: 1,
                                      gridHeight: 1,
                                      action: { type: 'load_slot', slotNumber: widget.saveSlotConfig?.slotNumber }
                                    });
                                  }
                                }}
                                className="px-3 py-1 rounded text-xs font-bold"
                                style={{
                                  backgroundColor: activeTheme.primaryAccent,
                                  color: '#000000'
                                }}
                              >
                                Load
                              </button>
                            </div>
                          </div>
                        )}
                      </ModularOrnamentalBorder>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
