import { getTasksForScope } from '@/core/ai/director-tasks';
import { DirectorTaskPanel } from '@/modules/director/components/DirectorTaskPanel';

const TASKS = getTasksForScope('nutrition');

export function NutritionDirectorPanel() {
  return (
    <DirectorTaskPanel
      title="DIRECTOR — Nutrition"
      scope="nutrition"
      tasks={TASKS}
      freeInputPlaceholder="Анализ рациона, замены блюд, меню на день…"
    />
  );
}
