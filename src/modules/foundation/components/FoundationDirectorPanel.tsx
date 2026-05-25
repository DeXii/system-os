import { getTasksForScope } from '@/core/ai/director-tasks';
import { DirectorTaskPanel } from '@/modules/director/components/DirectorTaskPanel';

interface Props {
  onApplied: () => void;
}

const TASKS = getTasksForScope('foundation').filter(
  (t) => t.id === 'foundationCoach' || t.id === 'freeCommand'
);

export function FoundationDirectorPanel({ onApplied }: Props) {
  return (
    <DirectorTaskPanel
      title="DIRECTOR — Foundation"
      scope="foundation"
      tasks={TASKS}
      onApplied={onApplied}
      freeInputPlaceholder="Запрос, напр. «сгенерируй HIFT на турнике»"
    />
  );
}
