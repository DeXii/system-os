import type { TaskId } from '../../director-tasks';
import { buildCorePrompt } from '../base/core.prompt';
import { buildTaskSystemPrompt } from './build-task-system-prompt';

export function buildSystemPrompt(taskId: TaskId, options?: { aiModeHint?: string }): string {
  return [buildCorePrompt(), buildTaskSystemPrompt(taskId, options)].filter(Boolean).join('\n\n');
}

/** @deprecated Use buildSystemPrompt */
export const assembleDirectorSystemPrompt = buildSystemPrompt;

export { buildCorePrompt, buildTaskSystemPrompt };
