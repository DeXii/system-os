import type { AiAction } from '../../../domain/types';
import type { ParsedContextSnapshot, ValidateActionsOptions } from '../../director/director-types';
import { aiActionsArraySchema, validateActionPayload } from '../schemas/actions.schema';
import { exerciseIdAllowed, payloadUsesForbiddenEquipment } from './validate-equipment';

export interface ValidateActionsResult {
  actions: AiAction[];
  dropped: { action: AiAction; reason: string }[];
}

export function parseContextSnapshot(contextJson: string): ParsedContextSnapshot {
  try {
    const ctx = JSON.parse(contextJson) as Record<string, unknown>;
    const foundation = ctx.foundation as Record<string, unknown> | undefined;
    const schedule = ctx.schedule as { todayQueue?: { taskKey?: string }[] } | undefined;
    const readiness = ctx.readiness as ParsedContextSnapshot['readiness'];
    const constraints = ctx.constraints as { flags?: Record<string, boolean> } | undefined;
    return {
      allowedExerciseIds: foundation?.allowedExerciseIds as string[] | undefined,
      todayTaskKeys: schedule?.todayQueue
        ?.map((s) => s.taskKey)
        .filter((k): k is string => !!k),
      contextSinceDate: ctx.contextSinceDate as string | undefined,
      readiness,
      flags: constraints?.flags,
    };
  } catch {
    return {};
  }
}

export function validateAndFilterActions(
  raw: unknown,
  options: ValidateActionsOptions
): ValidateActionsResult {
  const dropped: ValidateActionsResult['dropped'] = [];
  const parsed = aiActionsArraySchema.safeParse(raw);
  if (!parsed.success) {
    return { actions: [], dropped: [{ action: { type: 'log_note', payload: {} }, reason: parsed.error.message }] };
  }

  const allowedSet = new Set(options.allowedActions);
  const out: AiAction[] = [];

  for (const item of parsed.data) {
    const action = item as AiAction;
    if (!allowedSet.has(action.type)) {
      dropped.push({ action, reason: `type not allowed: ${action.type}` });
      continue;
    }

    const payloadCheck = validateActionPayload(action.type, action.payload);
    if (!payloadCheck.ok) {
      dropped.push({ action, reason: payloadCheck.error });
      continue;
    }
    const normalized: AiAction = { type: action.type, payload: payloadCheck.payload };

    if (payloadUsesForbiddenEquipment(normalized.payload)) {
      dropped.push({ action: normalized, reason: 'forbidden equipment in payload' });
      continue;
    }

    if (normalized.type === 'set_workout_plan') {
      const exercises = normalized.payload.exercises;
      if (Array.isArray(exercises)) {
        const invalid = (exercises as { exerciseId?: string }[]).some(
          (ex) => ex.exerciseId && !exerciseIdAllowed(ex.exerciseId, options.context.allowedExerciseIds)
        );
        if (invalid) {
          dropped.push({ action: normalized, reason: 'exerciseId not in allowedExerciseIds' });
          continue;
        }
      }
    }

    if (
      (normalized.type === 'move_slot' || normalized.type === 'complete_slot') &&
      options.context.todayTaskKeys?.length
    ) {
      const key = String(normalized.payload.taskKey ?? '');
      if (key && !options.context.todayTaskKeys.includes(key)) {
        dropped.push({ action: normalized, reason: `taskKey not in todayQueue: ${key}` });
        continue;
      }
    }

    out.push(normalized);
  }

  return { actions: out, dropped };
}
