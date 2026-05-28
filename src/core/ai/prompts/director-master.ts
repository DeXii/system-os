/**
 * @deprecated Prompt assembly moved to prompts/builders/build-system-prompt.ts
 * and prompts/registry/task-registry.ts
 */
import type { TaskId } from '../director-tasks';
import { buildSystemPrompt } from './builders/build-system-prompt';
import { renderTaskTemplate } from './templates';
import { getTaskPromptConfig } from './registry/task-registry';

export const DIRECTOR_MASTER_PROMPT = buildSystemPrompt('freeCommand');

/** @deprecated Use TASK_REGISTRY + buildSystemPrompt(taskId) */
export const TASK_ADDENDUMS: Partial<Record<TaskId, string>> = new Proxy(
  {} as Partial<Record<TaskId, string>>,
  {
    get(_target, prop: string) {
      if (typeof prop !== 'string') return undefined;
      const config = getTaskPromptConfig(prop as TaskId);
      return renderTaskTemplate(config);
    },
  }
);

export { buildSystemPrompt, buildSystemPrompt as assembleDirectorSystemPrompt };
