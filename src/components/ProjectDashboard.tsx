import React from 'react';
import { MasonProject } from '../engine/masonProjectSchema';
import { useAppTheme } from '../theme/ThemeContext';
import { getContrastTextColor } from '../theme/appTheme';
import { ProjectTaskBoard } from './dashboard/ProjectTaskBoard';
import { 
  Folder, 
  FileCode, 
  Clock, 
  User, 
  Edit3, 
  Sparkles, 
  Layers, 
  Compass, 
  Download, 
  Settings,
  Map,
  TreePine,
  Users,
  Sliders,
  Network,
  Palette,
  Paintbrush,
  HardDrive,
  Link2,
  FolderSync,
  Lock,
  Unlock,
  Cloud,
  RefreshCw,
  ChevronRight,
  Shield,
  Box,
  Globe,
  Play
} from 'lucide-react';
import { releaseProjectLock, FileLockInfo } from '../utils/linkedSaveTarget';
import { RemoteChangedFilesModal } from './RemoteChangedFilesModal';

interface ProjectDashboardProps {
  project: MasonProject;
  onUpdateProject: (
    updated: MasonProject | ((prev: MasonProject) => MasonProject),
    options?: { preserveUpdatedAt?: boolean; skipBackups?: boolean; actionLabel?: string; syncLinked?: boolean }
  ) => void;
  onLaunchModule: (moduleId: string) => void;
  onOpenExplorer: () => void;
  onOpenModulesModal?: () => void;
  onOpenThemeModal?: () => void;
  onOpenAppProfileConfigModal?: () => void;
  onExportBundle: () => void;
  onRefreshFromLinked?: () => Promise<void> | void;
  isSyncingLinked?: boolean;
  isOutOfSync?: boolean;
  remoteLockInfo?: FileLockInfo;
  remoteIsLockedByOther?: boolean;
  onForceUnlockProject?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  onUpdateProject,
  onLaunchModule,
  onOpenExplorer,
  onOpenModulesModal,
  onOpenThemeModal,
  onOpenAppProfileConfigModal,
  onExportBundle,
  onRefreshFromLinked,
  isSyncingLinked = false,
  isOutOfSync = false,
  remoteLockInfo,
  remoteIsLockedByOther,
  onForceUnlockProject,
  onShowToast
}) => {
  const [isChangedFilesModalOpen, setIsChangedFilesModalOpen] = React.useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = React.useState(false);
  const [name, setName] = React.useState(project.name);
  const [author, setAuthor] = React.useState(project.author || 'Mason Architect');
  const [description, setDescription] = React.useState(project.description || '');

  const { theme, primaryDef, bgDef, getModuleColorDef } = useAppTheme();

  const handleSaveMetadata = () => {
    onUpdateProject({
      ...project,
      name,
      author,
      description
    });
    setIsEditingMetadata(false);
  };

  // Core 3-Module Colors & Metrics
  const mainSceneColor = getModuleColorDef('main_scene');
  const subScenesColor = getModuleColorDef('sub_scenes');
  const objectsColor = getModuleColorDef('objects');

  const subSceneCount = project.fileSystem?.scenes3d?.length || project.fileSystem?.maps?.length || 1;
  const objectCount = project.fileSystem?.prefabs?.length || project.fileSystem?.models3d?.length || 1;
  const totalFiles = 1 + subSceneCount + objectCount;

  return (
    <div 
      className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 select-none max-w-6xl mx-auto w-full transition-colors duration-200"
      style={{ backgroundColor: bgDef.hex }}
    >
      
      {/* Project Banner & Overview */}
      <div 
        className="relative overflow-hidden rounded-3xl border p-6 md:p-8 shadow-2xl transition-all duration-300"
        style={{
          backgroundColor: bgDef.cardHex,
          borderColor: bgDef.borderHex
        }}
      >
        {/* Dynamic Glow backdrop */}
        <div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-20"
          style={{ backgroundColor: primaryDef.hex }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span 
                className="text-xs font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm"
                style={{
                  backgroundColor: `rgba(${primaryDef.rgb}, 0.15)`,
                  borderColor: `rgba(${primaryDef.rgb}, 0.35)`,
                  color: primaryDef.hex
                }}
              >
                Active Mason Project
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-neutral-100 tracking-tight">
              {project.name}
            </h1>

            <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
              {project.description || '2D Metroidvania project with modular level design, 7-layer parallax biomes, prefabs, and game flow architecture.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-2 font-mono">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-neutral-500" />
                <span className="text-neutral-300">{project.author || 'Mason Architect'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-neutral-500" />
                <span>Updated: {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Folder size={13} className="text-neutral-500" />
                <span style={{ color: primaryDef.hex }} className="font-bold">{totalFiles} Project Files</span>
              </span>

              {/* Linked Storage Target Status Badge */}
              {project.storageLocation ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isOutOfSync ? (
                    <button
                      type="button"
                      id="btn-dashboard-changes-available"
                      onClick={() => setIsChangedFilesModalOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border bg-amber-950/90 border-amber-500/80 text-amber-200 hover:bg-amber-900/90 hover:border-amber-400 hover:text-white transition shadow-sm cursor-pointer group animate-pulse hover:animate-none"
                      title="Click to view list of changed remote files"
                    >
                      <FolderSync size={12} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold underline underline-offset-2">Changes Available Remotely</span>
                      <ChevronRight size={12} className="text-amber-400 opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border bg-emerald-950/80 border-emerald-700/60 text-emerald-300">
                      {project.storageLocation.type === 'local_directory' ? (
                        <FolderSync size={12} className="text-emerald-400 shrink-0" />
                      ) : project.storageLocation.type === 'gdrive' || project.storageLocation.type === 'onedrive' ? (
                        <Cloud size={12} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Link2 size={12} className="text-cyan-400 shrink-0" />
                      )}
                      <span>
                        Linked: {project.storageLocation.displayName || project.storageLocation.fileName || project.storageLocation.targetFolderName}
                      </span>
                    </span>
                  )}

                  {onRefreshFromLinked && (
                    <button
                      type="button"
                      id="btn-dashboard-pull-updates"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefreshFromLinked();
                      }}
                      disabled={isSyncingLinked}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition border cursor-pointer ${
                        isOutOfSync
                          ? 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400 shadow-sm'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                      }`}
                      title="Pull updates for out-of-sync files from linked storage"
                    >
                      <RefreshCw size={11} className={isSyncingLinked ? 'animate-spin' : ''} />
                      <span>{isSyncingLinked ? 'Syncing...' : isOutOfSync ? 'Pull Updates' : 'Refresh'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 text-[11px] font-mono">
                  <HardDrive size={12} className="text-neutral-500 shrink-0" />
                  <span>Target: Browser Storage (Unlinked)</span>
                </span>
              )}

              {/* Multi-User Concurrency Lock Badge */}
              {((project.lockInfo && project.lockInfo.isLocked) || (remoteLockInfo && remoteLockInfo.isLocked)) && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/90 border border-amber-700/70 text-amber-300 text-[11px] font-mono group">
                  <Lock size={12} className="text-amber-400 shrink-0" />
                  <span>
                    Locked by: {(remoteLockInfo?.isLocked ? remoteLockInfo : project.lockInfo)?.lockedByProfile?.name || 
                                (remoteLockInfo?.isLocked ? remoteLockInfo : project.lockInfo)?.lockedBy || 'Collaborator'}
                  </span>
                  <button
                    type="button"
                    id="btn-dashboard-force-unlock"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onForceUnlockProject) {
                        onForceUnlockProject();
                      } else {
                        const unlocked = releaseProjectLock(project);
                        onUpdateProject(unlocked, { actionLabel: 'Force unlock project', syncLinked: true });
                        if (onShowToast) {
                          onShowToast('Project force-unlocked and lock released.', 'success');
                        }
                      }
                    }}
                    className="ml-2 px-2 py-0.5 rounded bg-amber-900/80 hover:bg-amber-800 text-amber-200 hover:text-white border border-amber-600/60 text-[10px] font-sans font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
                    title="Force Unlock"
                  >
                    <Unlock size={11} />
                    <span>Force Unlock</span>
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenModulesModal}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl flex items-center justify-center gap-2 transition active:scale-95"
              style={{
                backgroundColor: primaryDef.hex,
                color: getContrastTextColor(primaryDef),
                boxShadow: `0 10px 20px -5px rgba(${primaryDef.rgb}, 0.35)`
              }}
            >
              <span>🧩 Open Modules Directory</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenExplorer}
                className="flex-1 px-4 py-2 rounded-2xl border text-neutral-300 text-xs font-bold flex items-center justify-center gap-2 transition hover:text-white"
                style={{
                  backgroundColor: bgDef.hex,
                  borderColor: bgDef.borderHex
                }}
              >
                <span>📂 Files Hub</span>
              </button>

              {onOpenThemeModal && (
                <button
                  type="button"
                  onClick={onOpenThemeModal}
                  className="px-3.5 py-2 rounded-2xl border text-neutral-300 text-xs font-bold flex items-center justify-center gap-1.5 transition hover:text-white"
                  style={{
                    backgroundColor: bgDef.hex,
                    borderColor: bgDef.borderHex
                  }}
                  title="Customize Theme & Colors"
                >
                  <Palette size={14} style={{ color: primaryDef.hex }} />
                  <span className="hidden sm:inline">Theme</span>
                </button>
              )}

              {onOpenAppProfileConfigModal && (
                <button
                  type="button"
                  onClick={onOpenAppProfileConfigModal}
                  className="px-3.5 py-2 rounded-2xl border text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition hover:text-white bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                  title="User Profiles & App Configuration"
                >
                  <User size={14} className="text-amber-400" />
                  <span>User Profiles & Config</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingMetadata(!isEditingMetadata)}
              className="px-5 py-1.5 rounded-xl text-neutral-400 hover:text-white text-[11px] font-mono flex items-center justify-center gap-1.5 transition"
            >
              <Edit3 size={12} />
              <span>{isEditingMetadata ? 'Close Settings' : 'Edit Project Details'}</span>
            </button>
          </div>
        </div>

        {/* Project Metadata Edit Form (Collapsible) */}
        {isEditingMetadata && (
          <div 
            className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200"
            style={{ borderColor: bgDef.borderHex }}
          >
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-400">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                style={{
                  backgroundColor: bgDef.hex,
                  borderColor: bgDef.borderHex
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-400">Lead Author / Studio</label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                style={{
                  backgroundColor: bgDef.hex,
                  borderColor: bgDef.borderHex
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-neutral-400">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                style={{
                  backgroundColor: bgDef.hex,
                  borderColor: bgDef.borderHex
                }}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingMetadata(false)}
                className="px-4 py-1.5 rounded-xl text-neutral-400 border hover:text-white text-xs"
                style={{
                  backgroundColor: bgDef.hex,
                  borderColor: bgDef.borderHex
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMetadata}
                className="px-4 py-1.5 rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: primaryDef.hex,
                  color: getContrastTextColor(primaryDef)
                }}
              >
                Save Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Streamlined 3-Tier Core Architecture (Main Scene, Sub-Scenes, Objects) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Core Architecture & Gameplay Foundation
            </h3>
            <p className="text-xs text-neutral-400">
              Streamlined 3-module model: 1 Persistent Main Scene, isolated Sub-Scenes (1 loaded at a time), and Component-based Objects.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onLaunchModule('main_scene')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
          >
            <Shield size={13} />
            <span>Launch Main Scene</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Main Scene */}
          <div
            onClick={() => onLaunchModule('main_scene')}
            className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-950 hover:border-amber-500 transition cursor-pointer group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Globe size={18} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase">
                  Root Scene
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-3 group-hover:text-amber-300 transition-colors">
                Main Scene
              </h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Persistent root orchestrator: Splash screens, Start menu, Settings, Save/Load slots, Persistent HUD & Fray UI, and 3D world coordinates.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-amber-400 font-medium">
              <span>Sub-Scene Orchestrator</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Sub-Scenes */}
          <div
            onClick={() => onLaunchModule('sub_scenes')}
            className="p-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 via-neutral-900 to-neutral-950 hover:border-cyan-500 transition cursor-pointer group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Layers size={18} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md uppercase">
                  Containers
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-3 group-hover:text-cyan-300 transition-colors">
                Sub-Scenes
              </h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Containers for actual gameplay spaces (Ashen Outpost, Ruined Sanctum). Holds placed 3D objects; strictly 1 active at runtime.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-cyan-400 font-medium">
              <span>Level & Object Placement</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Objects */}
          <div
            onClick={() => onLaunchModule('objects')}
            className="p-4 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-neutral-900 to-neutral-950 hover:border-purple-500 transition cursor-pointer group shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <Box size={18} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md uppercase">
                  Entity-Graph
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-3 group-hover:text-purple-300 transition-colors">
                Objects
              </h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Build objects starting with an Empty 3D Object. Attach components (Meshes, Sprites, Colliders, Fray Loadouts) and visual Logic Graphs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-purple-400 font-medium">
              <span>Components & Functions</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>



      {/* Project Kanban & Task Board Section */}
      <ProjectTaskBoard
        taskBoard={project.taskBoard}
        onUpdateTaskBoard={updatedBoard => {
          onUpdateProject({
            ...project,
            taskBoard: updatedBoard,
            updatedAt: new Date().toISOString()
          });
        }}
      />

      {/* Remote Changed Files Inspection Modal */}
      {isChangedFilesModalOpen && (
        <RemoteChangedFilesModal
          isOpen={isChangedFilesModalOpen}
          onClose={() => setIsChangedFilesModalOpen(false)}
          project={project}
          onPullUpdates={async () => {
            if (onRefreshFromLinked) {
              await onRefreshFromLinked();
            }
          }}
          isSyncing={isSyncingLinked}
        />
      )}

    </div>
  );
};
