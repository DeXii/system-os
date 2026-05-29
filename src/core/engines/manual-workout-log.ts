import { getCatalogExerciseById } from '@/content/exercises';
import {
  buildPlannedFromTemplate,
  getLocalTemplate,
  LOCAL_HIFT,
} from '@/content/exercises/local-workout-templates';
import { afterWorkoutComplete } from '@/core/kernel/automations/after-foundation';
import {
  gppKindFromSubtype,
  type ExerciseMeasure,
  type GppSubtype,
  type PlannedExercise,
  type SetLog,
  type WorkoutKind,
  type WorkoutPlan,
} from '@/core/domain/types';
import { db, todayKey, uid } from '@/core/db';

export type ManualWorkoutType = 'hift' | GppSubtype;

export interface ManualSetRow {
  key: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  roundIndex?: number;
  targetReps: number;
  targetSeconds?: number;
  measure: ExerciseMeasure;
  restSec: number;
  actual: string;
}

export interface ManualWorkoutFormPreview {
  kind: WorkoutKind;
  gppSubtype?: GppSubtype;
  structure: WorkoutPlan['structure'];
  rounds?: number;
  roundRestSec?: number;
  circuitExerciseIds?: string[];
  exercises: PlannedExercise[];
  rows: ManualSetRow[];
  templateHint?: string;
}

export interface LogManualWorkoutInput {
  date: string;
  type: ManualWorkoutType;
  durationMin: number;
  notes?: string;
  rows: ManualSetRow[];
}

const HIFT_ROUNDS = 3;

function exerciseName(id: string): string {
  return getCatalogExerciseById(id)?.name ?? id;
}

function rowFromPlanned(
  ex: PlannedExercise,
  setIndex: number,
  roundIndex?: number
): ManualSetRow {
  const measure: ExerciseMeasure =
    ex.measure ?? (ex.targetSeconds != null ? 'seconds' : 'reps');
  const targetSeconds =
    ex.targetSeconds ?? (measure === 'seconds' ? ex.targetReps : undefined);
  return {
    key: `${ex.exerciseId}-${roundIndex ?? 's'}-${setIndex}`,
    exerciseId: ex.exerciseId,
    exerciseName: exerciseName(ex.exerciseId),
    setIndex,
    roundIndex,
    targetReps: ex.targetReps,
    targetSeconds,
    measure,
    restSec: ex.restSec,
    actual: '',
  };
}

export function buildManualWorkoutPreview(type: ManualWorkoutType): ManualWorkoutFormPreview {
  if (type === 'hift') {
    const exercises = buildPlannedFromTemplate(LOCAL_HIFT);
    const rows: ManualSetRow[] = [];
    for (let roundIndex = 0; roundIndex < HIFT_ROUNDS; roundIndex++) {
      for (const ex of exercises) {
        rows.push(rowFromPlanned(ex, 0, roundIndex));
      }
    }
    return {
      kind: 'hift',
      structure: 'circuit',
      rounds: HIFT_ROUNDS,
      roundRestSec: 120,
      circuitExerciseIds: LOCAL_HIFT.map((e) => e.exerciseId),
      exercises,
      rows,
    };
  }

  const template = getLocalTemplate(type);
  const exercises = buildPlannedFromTemplate(template);
  const rows: ManualSetRow[] = [];
  for (const ex of exercises) {
    for (let setIndex = 0; setIndex < ex.sets; setIndex++) {
      rows.push(rowFromPlanned(ex, setIndex));
    }
  }
  const templateHint =
    type === 'core' || type === 'legs'
      ? 'Шаблон legs+core (общий для core и legs)'
      : undefined;

  return {
    kind: gppKindFromSubtype(type),
    gppSubtype: type,
    structure: 'straight_sets',
    exercises,
    rows,
    templateHint,
  };
}

export function setLogsFromManualRows(
  planId: string,
  date: string,
  kind: WorkoutKind,
  rows: ManualSetRow[]
): SetLog[] {
  const logs: SetLog[] = [];
  for (const row of rows) {
    const raw = Number(row.actual);
    if (!raw || raw <= 0) continue;
    const targetSeconds =
      row.targetSeconds ?? (row.measure === 'seconds' ? row.targetReps : undefined);
    logs.push({
      id: uid(),
      date,
      workoutPlanId: planId,
      exerciseId: row.exerciseId,
      setIndex: row.setIndex,
      targetReps: row.targetReps,
      actualReps: row.measure === 'reps' ? raw : 0,
      targetSeconds,
      actualSeconds: row.measure === 'seconds' ? raw : undefined,
      measure: row.measure,
      restSec: row.restSec,
      workoutKind: kind,
      roundIndex: row.roundIndex,
    });
  }
  return logs;
}

export function validateManualWorkoutInput(input: LogManualWorkoutInput): string | null {
  if (input.date > todayKey()) return 'Дата не может быть в будущем';
  if (input.durationMin < 1) return 'Укажите длительность (мин) ≥ 1';
  const logs = setLogsFromManualRows('preview', input.date, previewKind(input.type), input.rows);
  if (logs.length === 0) return 'Заполните хотя бы один подход (факт > 0)';
  return null;
}

function previewKind(type: ManualWorkoutType): WorkoutKind {
  return type === 'hift' ? 'hift' : gppKindFromSubtype(type);
}

export async function logManualWorkout(input: LogManualWorkoutInput): Promise<WorkoutPlan> {
  const err = validateManualWorkoutInput(input);
  if (err) throw new Error(err);

  const preview = buildManualWorkoutPreview(input.type);
  const planId = uid();
  const userNote = input.notes?.trim();
  const notes = userNote ? `manual: ${userNote}` : 'manual';

  const plan: WorkoutPlan = {
    id: planId,
    date: input.date,
    kind: preview.kind,
    structure: preview.structure,
    rounds: preview.rounds,
    roundRestSec: preview.roundRestSec,
    circuitExerciseIds: preview.circuitExerciseIds,
    gppSubtype: preview.gppSubtype,
    exercises: preview.exercises,
    status: 'completed',
    notes,
  };

  const setLogs = setLogsFromManualRows(planId, input.date, preview.kind, input.rows);

  await db.workoutPlans.put(plan);
  for (const log of setLogs) {
    await db.setLogs.add(log);
  }

  await afterWorkoutComplete(plan, {
    durationMin: input.durationMin,
    source: 'manual',
  });

  return plan;
}

export async function listRecentManualWorkouts(limit = 5): Promise<WorkoutPlan[]> {
  const all = await db.workoutPlans.toArray();
  return all
    .filter((p) => p.notes?.startsWith('manual'))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, limit);
}
