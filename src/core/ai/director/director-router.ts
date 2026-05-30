import { buildDirectorContextForTask } from '../context/assemble-context';
import type { WorkoutContextOptions } from '../context-builder';
import { getAiModeHintForPrompt } from '../constraints-builder';
import type { ContextConstraints } from '../constraints-builder';
import { buildSystemPrompt } from '../prompts/builders/build-system-prompt';
import { buildUserMessage } from '../prompts/builders/build-task-prompt';
import { getTaskPromptConfig } from '../prompts/registry/task-registry';
import {
  parseContextSnapshot,
  validateAndFilterActions,
} from '../prompts/validators/validate-actions';
import {
  isDeepAnalysisTask,
  isFoundationPlanTask,
  isInfluenceCoachTask,
  isNutritionCoachTask,
  isRegulationCoachTask,
  resolveLookbackDays,
  resolveScope,
  type ContextLookbackDays,
  type TaskId,
} from '../director-tasks';
import {
  buildFoundationDirective,
  formatFoundationDirectiveForPrompt,
} from '../../engines/foundation-metrics';
import {
  buildInfluenceDirective,
  formatInfluenceDirectiveForPrompt,
} from '../../engines/influence-metrics';
import {
  buildNutritionDirective,
  formatNutritionDirectiveForPrompt,
} from '../../engines/nutrition-metrics';
import {
  buildRegulationDirective,
  formatRegulationDirectiveForPrompt,
} from '../../engines/regulation-metrics';
import type { ModuleId } from '../../domain/types';
import { parseAiActions, stripActionsBlock } from './director-response-parser';

export interface DirectorRunOptions {
  userMessage?: string;
  scope?: ModuleId | 'full';
  lookbackDays?: ContextLookbackDays;
  workoutContext?: WorkoutContextOptions;
}

export interface DirectorPromptBundle {
  system: string;
  user: string;
  contextJson: string;
  allowedActions: ReturnType<typeof getTaskPromptConfig>['allowedActions'];
}

function extractAiModeHint(contextJson: string): string | undefined {
  try {
    const ctx = JSON.parse(contextJson) as {
      constraints?: ContextConstraints;
    };
    if (ctx.constraints) {
      return getAiModeHintForPrompt(ctx.constraints);
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function buildDirectorPromptBundle(
  taskId: TaskId,
  options?: DirectorRunOptions
): Promise<DirectorPromptBundle> {
  const lookbackDays = resolveLookbackDays(taskId, options?.lookbackDays);
  const scope = isDeepAnalysisTask(taskId) ? 'full' : resolveScope(taskId, options?.scope);
  const contextJson = await buildDirectorContextForTask(taskId, {
    lookbackDays,
    workoutContext: options?.workoutContext,
    scope,
  });
  const aiModeHint = extractAiModeHint(contextJson);
  const config = getTaskPromptConfig(taskId);

  let operatorMessage = options?.userMessage;
  if (isFoundationPlanTask(taskId)) {
    const directive = await buildFoundationDirective();
    const prefix = formatFoundationDirectiveForPrompt(directive);
    operatorMessage = operatorMessage
      ? `${prefix}\n\n${operatorMessage}`
      : `${prefix}\n\nСоставь план по расчёту выше.`;
  }
  if (isRegulationCoachTask(taskId)) {
    const directive = await buildRegulationDirective();
    const prefix = formatRegulationDirectiveForPrompt(directive);
    operatorMessage = operatorMessage
      ? `${prefix}\n\n${operatorMessage}`
      : `${prefix}\n\nПротокол на сегодня — строго по расчёту выше.`;
  }
  if (isInfluenceCoachTask(taskId)) {
    const directive = await buildInfluenceDirective();
    const prefix = formatInfluenceDirectiveForPrompt(directive);
    operatorMessage = operatorMessage
      ? `${prefix}\n\n${operatorMessage}`
      : `${prefix}\n\nТактика класса — строго по расчёту выше.`;
  }
  if (isNutritionCoachTask(taskId)) {
    const directive = await buildNutritionDirective();
    const prefix = formatNutritionDirectiveForPrompt(directive);
    operatorMessage = operatorMessage
      ? `${prefix}\n\n${operatorMessage}`
      : `${prefix}\n\nПитание на сегодня — строго по расчёту выше.`;
  }

  return {
    system: buildSystemPrompt(taskId, { aiModeHint }),
    user: buildUserMessage(taskId, contextJson, { operatorMessage }),
    contextJson,
    allowedActions: config.allowedActions,
  };
}

export function processDirectorResponse(
  rawText: string,
  contextJson: string,
  allowedActions: DirectorPromptBundle['allowedActions']
): {
  text: string;
  actions: ReturnType<typeof validateAndFilterActions>['actions'];
  dropped: ReturnType<typeof validateAndFilterActions>['dropped'];
  rawActionCount: number;
} {
  const rawActions = parseAiActions(rawText);
  const context = parseContextSnapshot(contextJson);
  const { actions, dropped } = validateAndFilterActions(rawActions, {
    allowedActions,
    context,
  });
  return {
    text: stripActionsBlock(rawText),
    actions,
    dropped,
    rawActionCount: rawActions.length,
  };
}
