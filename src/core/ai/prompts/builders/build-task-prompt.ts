import type { TaskId } from '../../director-tasks';
import { getTaskPromptConfig } from '../registry/task-registry';

export function buildUserMessage(
  taskId: TaskId,
  contextJson: string,
  options?: { operatorMessage?: string }
): string {
  const config = getTaskPromptConfig(taskId);
  const allowed =
    config.allowedActions.length > 0
      ? config.allowedActions.join(', ')
      : 'нет (пустой массив [])';

  if (options?.operatorMessage) {
    return [
      'Контекст оператора:',
      contextJson,
      '',
      `Задача: ${taskId}`,
      `Разрешённые actions: ${allowed}`,
      '',
      'Запрос оператора:',
      options.operatorMessage,
    ].join('\n');
  }

  return [
    'Контекст оператора:',
    contextJson,
    '',
    `Выполни задачу: ${taskId}`,
    `Разрешённые actions: ${allowed}`,
  ].join('\n');
}
