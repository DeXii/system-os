import { getTasksForScope } from '@/core/ai/director-tasks';
import { DirectorTaskPanel } from '@/modules/director/components/DirectorTaskPanel';

interface Props {
  onApplied: () => void;
}

const TASKS = getTasksForScope('integration').filter(
  (t) =>
    t.id === 'pdpReview' ||
    t.id === 'stageGateReview' ||
    t.id === 'weeklyAudit' ||
    t.id === 'freeCommand'
);

export function IntegrationDirectorPanel({ onApplied }: Props) {
  return (
    <DirectorTaskPanel
      title="DIRECTOR — Integration"
      scope="integration"
      tasks={TASKS}
      onApplied={onApplied}
      freeInputPlaceholder="Запрос к DIRECTOR..."
    />
  );
}
