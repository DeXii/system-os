import type { TaskId } from '../../director-tasks';
import { describeActionsForPrompt } from '../registry/action-registry';
import { getTaskPromptConfig } from '../registry/task-registry';
import { renderConstraintBlock } from '../rules';
import { renderTaskTemplate } from '../templates';
import { buildOutputFormatBlock } from './build-output-format';

/** Слой 2 — сценарий задачи (шаблон, ограничения, формат, actions) */
export function buildTaskSystemPrompt(
  taskId: TaskId,
  options?: { aiModeHint?: string }
): string {
  const config = getTaskPromptConfig(taskId);
  const parts = [
    'КОНТЕКСТ: переданный JSON — единственный источник данных (fact / derived / hints). См. DATA RULES в core.',
    'Используй только поля из переданного context; не трактуй перечисления в шаблоне как второй источник истины.',
    'OUTPUT DISCIPLINE: кратко. Без теории, мотивации и длинных объяснений.',
    options?.aiModeHint ? `РЕЖИМ: ${options.aiModeHint}` : '',
    renderConstraintBlock(config.constraintIds),
    renderTaskTemplate(config),
    buildOutputFormatBlock(config.outputFormat),
    describeActionsForPrompt(config.allowedActions),
  ].filter(Boolean);

  return parts.join('\n\n');
}
