import type { TaskId } from '../../director-tasks';
import { DOCTRINE_PROMPT } from '../base/doctrine.prompt';
import { HIERARCHY_PROMPT } from '../base/hierarchy.prompt';
import { SAFETY_PROMPT } from '../base/safety.prompt';
import { SYSTEM_PROMPT } from '../base/system.prompt';
import { TONE_PROMPT } from '../base/tone.prompt';
import { describeActionsForPrompt } from '../registry/action-registry';
import { getTaskPromptConfig } from '../registry/task-registry';
import { renderConstraintBlock } from '../rules';
import { renderTaskTemplate } from '../templates';
import { buildOutputFormatBlock } from './build-output-format';

export function buildSystemPrompt(taskId: TaskId, options?: { aiModeHint?: string }): string {
  const config = getTaskPromptConfig(taskId);
  const parts = [
    SYSTEM_PROMPT,
    TONE_PROMPT,
    HIERARCHY_PROMPT,
    SAFETY_PROMPT,
    DOCTRINE_PROMPT,
    renderConstraintBlock(config.constraintIds),
    options?.aiModeHint ? `РЕЖИМ ОПЕРАТОРА:\n- ${options.aiModeHint}` : '',
    '---',
    renderTaskTemplate(config),
    '---',
    buildOutputFormatBlock(config.outputFormat),
    '---',
    describeActionsForPrompt(config.allowedActions),
  ].filter(Boolean);

  return parts.join('\n\n');
}

/** @deprecated Use buildSystemPrompt */
export const assembleDirectorSystemPrompt = buildSystemPrompt;
