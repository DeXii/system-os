import { getQuickTasks, getTasksForScope } from '@/core/ai/director-tasks';
import type { ModuleId } from '@/core/domain/types';
import { DirectorTaskPanel } from './components/DirectorTaskPanel';

interface Props {
  compact?: boolean;
  activeModule?: ModuleId;
}

export function DirectorPanel({ compact, activeModule = 'command' }: Props) {
  const scope =
    activeModule === 'director' || activeModule === 'archive' ? 'full' : activeModule;
  const tasks = compact ? getQuickTasks() : getTasksForScope(scope);

  return (
    <DirectorTaskPanel
      title="DIRECTOR"
      scope={scope}
      tasks={tasks}
      compact={compact}
      variant={compact ? 'sidebar' : 'sidebar'}
      showHistory={false}
    />
  );
}
