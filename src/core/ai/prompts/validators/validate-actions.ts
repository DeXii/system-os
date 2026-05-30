import type { AiAction } from '../../../domain/types';
import type { ParsedContextSnapshot, ValidateActionsOptions } from '../../director/director-types';
import { aiActionsArraySchema, validateActionPayload } from '../schemas/actions.schema';
import { exerciseIdAllowed, payloadUsesForbiddenEquipment } from './validate-equipment';
import {
  remapWorkoutPlanExerciseIds,
  type ExerciseCatalogEntry,
} from './exercise-id-remap';

export interface ValidateActionsResult {
  actions: AiAction[];
  dropped: { action: AiAction; reason: string }[];
}

function unwrapLayeredContext(ctx: Record<string, unknown>): {
  fact: Record<string, unknown>;
  derived: Record<string, unknown>;
  hints: Record<string, unknown>;
  root: Record<string, unknown>;
} {
  if (ctx.fact && typeof ctx.fact === 'object') {
    return {
      fact: ctx.fact as Record<string, unknown>,
      derived: (ctx.derived as Record<string, unknown>) ?? {},
      hints: (ctx.hints as Record<string, unknown>) ?? {},
      root: ctx,
    };
  }
  return { fact: ctx, derived: ctx, hints: ctx, root: ctx };
}

export function parseContextSnapshot(contextJson: string): ParsedContextSnapshot {
  try {
    const ctx = JSON.parse(contextJson) as Record<string, unknown>;
    const { fact, derived, hints, root } = unwrapLayeredContext(ctx);
    const foundation = fact.foundation as Record<string, unknown> | undefined;
    const schedule = fact.schedule as { todayQueue?: { taskKey?: string }[] } | undefined;
    const readiness =
      (derived.readiness as ParsedContextSnapshot['readiness']) ??
      (root.readiness as ParsedContextSnapshot['readiness']);
    const constraints =
      (hints.constraints as { flags?: Record<string, boolean> }) ??
      (root.constraints as { flags?: Record<string, boolean> });
    const catalogRaw = foundation?.exerciseCatalog as ExerciseCatalogEntry[] | undefined;
    return {
      allowedExerciseIds: foundation?.allowedExerciseIds as string[] | undefined,
      exerciseCatalog: catalogRaw?.map((e) => ({
        id: String(e.id),
        name: e.name != null ? String(e.name) : undefined,
        pattern: e.pattern != null ? String(e.pattern) : undefined,
      })),
      todayTaskKeys: schedule?.todayQueue
        ?.map((s) => s.taskKey)
        .filter((k): k is string => !!k),
      contextSinceDate: (root.contextSinceDate ?? ctx.contextSinceDate) as string | undefined,
      readiness,
      flags: constraints?.flags,
    };
  } catch {
    return {};
  }
}

function normalizeSetWorkoutPlan(action: AiAction, context: ParsedContextSnapshot): AiAction {
  if (action.type !== 'set_workout_plan') return action;
  const exercises = action.payload.exercises;
  if (!Array.isArray(exercises)) return action;
  const { exercises: remapped } = remapWorkoutPlanExerciseIds(
    exercises as { exerciseId?: string }[],
    context.allowedExerciseIds,
    context.exerciseCatalog
  );
  return { type: action.type, payload: { ...action.payload, exercises: remapped } };
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
    let normalized: AiAction = { type: action.type, payload: payloadCheck.payload };

    if (normalized.type === 'set_workout_plan') {
      normalized = normalizeSetWorkoutPlan(normalized, options.context);
    }

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
