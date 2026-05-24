import { getTasksForScope } from '@/core/ai/director-tasks';
import { DirectorTaskPanel } from '@/modules/director/components/DirectorTaskPanel';

interface Props {
  onApplied: () => void;
}

const TASKS = getTasksForScope('mind').filter(
  (t) =>
    t.id === 'mindCoach' ||
    t.id === 'tacticalDebrief' ||
    t.id === 'freeCommand'
);

export function MindDirectorPanel({ onApplied }: Props) {
  return (
    <DirectorTaskPanel
      title="DIRECTOR — Mind"
      scope="mind"
      tasks={TASKS}
      onApplied={onApplied}
      freeInputPlaceholder="Запрос к DIRECTOR..."
    />
  );
}
