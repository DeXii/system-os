import { getTasksForScope } from '@/core/ai/director-tasks';
import { DirectorTaskPanel } from '@/modules/director/components/DirectorTaskPanel';

interface Props {
  onApplied: () => void;
}

const TASKS = getTasksForScope('influence').filter(
  (t) =>
    t.id === 'influenceCoach' ||
    t.id === 'contactBrief' ||
    t.id === 'preContactSimulation' ||
    t.id === 'operationReview' ||
    t.id === 'tacticalDebrief' ||
    t.id === 'freeCommand'
);

export function InfluenceDirectorPanel({ onApplied }: Props) {
  return (
    <DirectorTaskPanel
      title="DIRECTOR — Influence · Оператор"
      scope="influence"
      tasks={TASKS}
      onApplied={onApplied}
      freeInputPlaceholder="Запрос к DIRECTOR (контакт, переговоры, nudge)..."
    />
  );
}
