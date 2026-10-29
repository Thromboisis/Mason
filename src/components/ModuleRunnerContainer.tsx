import React from 'react';
import { MasonProject } from '../engine/masonProjectSchema';
import { getModuleById } from '../engine/modulesRegistry';
import { MainSceneModule } from './scene/MainSceneModule';
import { SubSceneModule } from './scene/SubSceneModule';
import { ObjectStudioModule } from './scene/ObjectStudioModule';

interface ModuleRunnerContainerProps {
  moduleId: string;
  project: MasonProject;
  onUpdateProject: (updated: MasonProject | ((prev: MasonProject) => MasonProject), options?: any) => void;
  onBackToProjectInfo: () => void;
  onOpenModulesModal: () => void;
  onOpenExplorer: () => void;
  onNavigateToModule?: (moduleId: string, fileOptions?: any) => void;
  onRefreshFromLinked?: () => void;
  isSyncingLinked?: boolean;
  isOutOfSync?: boolean;
}

export const ModuleRunnerContainer: React.FC<ModuleRunnerContainerProps> = ({
  moduleId,
  project,
  onUpdateProject,
  onBackToProjectInfo,
  onNavigateToModule
}) => {
  const modDef = getModuleById(moduleId);

  if (!modDef) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400">
        <p>Module "{moduleId}" not found.</p>
        <button
          type="button"
          onClick={onBackToProjectInfo}
          className="mt-4 px-4 py-2 bg-neutral-800 rounded-xl text-white text-xs font-bold"
        >
          Back to Project Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 select-none">
      <div className="w-full h-full flex flex-col overflow-hidden">
        {moduleId === 'main_scene' && (
          <MainSceneModule
            project={project}
            onUpdateProject={onUpdateProject}
            onNavigateToSubScene={() => onNavigateToModule?.('sub_scenes')}
            onNavigateToObjects={() => onNavigateToModule?.('objects')}
          />
        )}
        {moduleId === 'sub_scenes' && (
          <SubSceneModule
            project={project}
            onUpdateProject={onUpdateProject}
            onNavigateToObjects={() => onNavigateToModule?.('objects')}
            onMountIntoMainScene={() => onNavigateToModule?.('main_scene')}
          />
        )}
        {moduleId === 'objects' && (
          <ObjectStudioModule
            project={project}
            onUpdateProject={onUpdateProject}
            onNavigateToSubScenes={() => onNavigateToModule?.('sub_scenes')}
          />
        )}
      </div>
    </div>
  );
};
