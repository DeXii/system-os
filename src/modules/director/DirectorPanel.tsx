import { getQuickTasks, getTasksForScope } from '@/core/ai/director-tasks';
import type { ModuleId } from '@/core/domain/types';
import { DirectorTaskPanel } from './components/DirectorTaskPanel';

interface Props {
  compact?: boolean;
  activeModule?: ModuleId;
  variant?: 'sidebar' | 'sheet';
  onClose?: () => void;
}

export function DirectorPanel({
  compact,
  activeModule = 'command',
  variant = 'sidebar',
  onClose,
}: Props) {
  const scope =
    activeModule === 'director' || activeModule === 'archive' ? 'full' : activeModule;
  const tasks = compact ? getQuickTasks() : getTasksForScope(scope);

  const panelClass =
    variant === 'sheet'
      ? 'director-panel director-panel--sheet open'
      : 'director-panel director-panel--sidebar';

  return (
    <div className={panelClass}>
      {variant === 'sheet' && onClose && (
        <div className="director-header">
          <span className="director-status">DIRECTOR</span>
          <button type="button" className="topbar-btn" onClick={onClose}>
            ESC
          </button>
        </div>
      )}
      <DirectorTaskPanel
        title="DIRECTOR"
        scope={scope}
        tasks={tasks}
        compact={compact}
        variant="sidebar"
        showHistory={false}
        hideHeader={variant === 'sheet'}
      />
    </div>
  );
}
