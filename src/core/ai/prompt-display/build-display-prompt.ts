import { buildCorePrompt } from '../prompts/base/core.prompt';
import { buildTaskSystemPrompt } from '../prompts/builders/build-task-system-prompt';
import { getTaskPromptConfig } from '../prompts/registry/task-registry';
import type { LastDirectorPrompt } from '@/stores/director-prompt-store';
import { contextJsonToProse, extractContextJsonFromUser } from './context-to-prose';

export interface DisplayPromptParts {
  systemCore: string;
  task: string;
  full: string;
}

function resolveContextJson(prompt: LastDirectorPrompt): string {
  if (prompt.contextJson?.trim()) return prompt.contextJson;
  return extractContextJsonFromUser(prompt.user);
}

function extractOperatorMessage(user: string): string | null {
  const marker = 'Запрос оператора:';
  const idx = user.indexOf(marker);
  if (idx < 0) return null;
  return user.slice(idx + marker.length).trim() || null;
}

function extractAllowedActions(user: string, taskId: LastDirectorPrompt['taskId']): string {
  const fromUser = user.match(/Разрешённые actions:\s*(.+)/)?.[1]?.trim();
  if (fromUser) return fromUser;
  const config = getTaskPromptConfig(taskId);
  return config.allowedActions.length > 0
    ? config.allowedActions.join(', ')
    : 'нет (пустой массив [])';
}

function buildTaskDataBlock(prompt: LastDirectorPrompt): string {
  const contextJson = resolveContextJson(prompt);
  const contextProse = contextJsonToProse(contextJson);
  const taskMeta = [
    `Задача: ${prompt.taskId}`,
    `Период: ${prompt.lookbackDays} дн. · Scope: ${prompt.scope}`,
    `Разрешённые actions: ${extractAllowedActions(prompt.user, prompt.taskId)}`,
  ];
  const operatorMsg = extractOperatorMessage(prompt.user);
  if (operatorMsg) {
    taskMeta.push(`Запрос оператора: ${operatorMsg}`);
  }
  return ['[ДАННЫЕ ОПЕРАТОРА]', contextProse, '', '[ЗАДАЧА]', ...taskMeta].join('\n');
}

export function buildDisplayPromptParts(prompt: LastDirectorPrompt): DisplayPromptParts {
  const systemCore = buildCorePrompt().trim();
  const taskSystem = buildTaskSystemPrompt(prompt.taskId).trim();
  const taskData = buildTaskDataBlock(prompt);
  const task = ['[СИСТЕМА ЗАДАЧИ]', taskSystem, '', taskData].join('\n');
  const full = ['--- SYSTEM CORE ---', systemCore, '', '--- TASK ---', task].join('\n');
  return { systemCore, task, full };
}

/** @deprecated Use buildDisplayPromptParts */
export function buildDisplayPrompt(prompt: LastDirectorPrompt): string {
  return buildDisplayPromptParts(prompt).full;
}
