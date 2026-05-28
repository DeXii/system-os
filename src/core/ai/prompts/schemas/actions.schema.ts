import { z } from 'zod';

const exerciseSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.number().int().positive().optional(),
  targetReps: z.number().optional(),
  targetSeconds: z.number().optional(),
  measure: z.string().optional(),
  restSec: z.number().optional(),
});

const payloadSchemas = {
  add_mission: z.object({
    title: z.string().min(1),
    taskKey: z.string().optional(),
    priority: z.string().optional(),
    stage: z.string().optional(),
  }),
  add_protocol: z.object({
    label: z.string().min(1),
    taskKey: z.string().optional(),
    priority: z.string().optional(),
    stage: z.string().optional(),
  }),
  log_note: z.object({
    text: z.string().min(1),
    note: z.string().optional(),
  }),
  move_slot: z.object({
    taskKey: z.string().min(1),
    toDate: z.string().optional(),
  }),
  complete_slot: z.object({
    taskKey: z.string().min(1),
  }),
  add_schedule_slot: z.object({
    title: z.string().min(1),
    taskKey: z.string().optional(),
  }),
  set_workout_plan: z.object({
    kind: z.string().optional(),
    structure: z.string().optional(),
    rounds: z.number().optional(),
    roundRestSec: z.number().optional(),
    gppSubtype: z.string().optional(),
    exercises: z.array(exerciseSchema).min(1),
  }),
  set_cardio_session_plan: z.object({
    kind: z.enum(['cardio_intense', 'cardio_easy']).optional(),
    durationMin: z.number().min(10).max(120),
    suggestedActivity: z.string().optional(),
    notes: z.string().optional(),
  }),
} as const;

export const actionTypeSchema = z.enum([
  'add_mission',
  'add_protocol',
  'log_note',
  'move_slot',
  'complete_slot',
  'add_schedule_slot',
  'set_workout_plan',
  'set_cardio_session_plan',
]);

export const aiActionSchema = z.object({
  type: actionTypeSchema,
  payload: z.record(z.unknown()),
});

export const aiActionsArraySchema = z.array(aiActionSchema);

export type ParsedAiAction = z.infer<typeof aiActionSchema>;

export function validateActionPayload(
  type: ParsedAiAction['type'],
  payload: Record<string, unknown>
): { ok: true } | { ok: false; error: string } {
  const schema = payloadSchemas[type];
  if (!schema) return { ok: false, error: `Unknown type: ${type}` };
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true };
}
