import { getTasksForScope } from '@/core/ai/director-tasks';
import { DirectorTaskPanel } from '@/modules/director/components/DirectorTaskPanel';

interface Props {
  onApplied: () => void;
}

const TASKS = getTasksForScope('regulation').filter(
  (t) => t.id === 'regulationCoach' || t.id === 'freeCommand'
);

export function RegulationDirectorPanel({ onApplied }: Props) {
  return (
    <DirectorTaskPanel
      title="DIRECTOR — Regulation"
      scope="regulation"
      tasks={TASKS}
      onApplied={onApplied}
      freeInputPlaceholder="Запрос, напр. «план дыхания при низком HRV»"
    />
  );
}
