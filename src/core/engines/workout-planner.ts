import {
  getCatalogExerciseById,
  getExercisesForKind,
} from '@/content/exercises';
import {
  buildPlannedFromTemplate,
  getLocalTemplate,
  LOCAL_HIFT,
  templateNotesLabel,
} from '@/content/exercises/local-workout-templates';
import { BAR_EXERCISES } from '@/content/exercises-bars';
import { TASK_KEYS } from '@/content/task-keys';
import { db, dateKeyDaysAgo, todayKey, uid, weekdayIndex } from '../db';
import { computeReadiness } from './readiness';
import {
  clampSets,
  getFitnessLevels,
  suggestTargetForExercise,
  tierForWorkoutKind,
} from './progression-engine';
import type {
  CatalogExercise,
  GppSubtype,
  OperatorCalibration,
  PlannedExercise,
  ReadinessScores,
  WorkoutKind,
  WorkoutPlan,
} from '../domain/types';
import { gppKindFromSubtype } from '../domain/types';
import {
  applyLoadCapToPlanned,
  getFoundationLoadModifiers,
} from './foundation-load';

function clampReps(n: number, min = 3, max = 12): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function getCalibration(): Promise<OperatorCalibration | null> {
  const row = await db.operatorCalibration.get('calibration');
  return row ?? null;
}

export async function saveCalibration(
  maxPullups: number,
  maxDips: number,
  plankSec: number
): Promise<OperatorCalibration> {
  const row: OperatorCalibration = {
    id: 'calibration',
    maxPullups,
    maxDips,
    plankSec,
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorCalibration.put(row);
  return row;
}

function workingReps(max: number, factor = 0.6): number {
  return clampReps(Math.floor(max * factor));
}

async function hadHeavyPullYesterday(): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const date = todayKey(since);
  const logs = await db.setLogs.where('date').equals(date).toArray();
  const pullIds = new Set(BAR_EXERCISES.filter((e) => e.pattern === 'pull').map((e) => e.id));
  return logs.some((l) => pullIds.has(l.exerciseId));
}

async function failedLastTwoSessions(exerciseId: string): Promise<boolean> {
  const since = dateKeyDaysAgo(30);
  const logs = (await db.setLogs.where('date').aboveOrEqual(since).toArray())
    .filter((l) => l.exerciseId === exerciseId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  const byDate = new Map<string, typeof logs>();
  for (const l of logs) {
    const arr = byDate.get(l.date) ?? [];
    arr.push(l);
    byDate.set(l.date, arr);
  }
  const dates = [...byDate.keys()].sort().reverse().slice(0, 2);
  if (dates.length < 2) return false;
  return dates.every((d) => {
    const sets = byDate.get(d)!;
    return sets.some((s) => s.actualReps < s.targetReps);
  });
}

export async function buildWorkoutPlan(
  date = todayKey(),
  readiness?: ReadinessScores
): Promise<WorkoutPlan> {
  const r = readiness ?? (await computeReadiness());
  const cal = await getCalibration();
  const maxPull = cal?.maxPullups ?? 5;
  const maxDip = cal?.maxDips ?? 8;
  const sets = r.foundation >= 60 ? 4 : 3;
  let deload = r.foundation < 45;

  const yesterdayCompliance = await db.dayReports
    .where('date')
    .equals(
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return todayKey(d);
      })()
    )
    .first();
  if (yesterdayCompliance && yesterdayCompliance.compliance < 50) deload = true;

  const wd = weekdayIndex(new Date(date + 'T12:00:00'));
  const pullHeavy = wd % 2 === 1;
  const skipHeavyPull = await hadHeavyPullYesterday();

  const exercises: PlannedExercise[] = [];
  const pullReps = deload
    ? clampReps(workingReps(maxPull) * 0.8)
    : workingReps(maxPull);
  const dipReps = deload
    ? clampReps(workingReps(maxDip) * 0.8)
    : workingReps(maxDip);
  const restPull = deload ? 105 : 90;
  const restPush = deload ? 75 : 60;

  if (!skipHeavyPull && pullHeavy) {
    exercises.push({
      exerciseId: maxPull >= 8 ? 'pullup' : 'australian',
      sets: deload ? Math.max(2, sets - 1) : sets,
      targetReps: pullReps,
      restSec: restPull,
    });
  } else {
    exercises.push({
      exerciseId: 'dip',
      sets: deload ? Math.max(2, sets - 1) : sets,
      targetReps: dipReps,
      restSec: restPush,
    });
  }

  exercises.push({
    exerciseId: pullHeavy ? 'dip' : 'pullup',
    sets: deload ? Math.max(2, sets - 1) : sets,
    targetReps: pullHeavy ? dipReps : pullReps,
    restSec: pullHeavy ? restPush : restPull,
  });

  exercises.push({
    exerciseId: 'knee_raise',
    sets: 3,
    targetReps: deload ? 8 : 10,
    restSec: 60,
  });

  exercises.push({
    exerciseId: 'plank',
    sets: 2,
    targetReps: cal?.plankSec ?? 45,
    restSec: 45,
  });

  for (const ex of exercises) {
    if (await failedLastTwoSessions(ex.exerciseId)) {
      ex.targetReps = clampReps(ex.targetReps - 1, 2, 12);
      ex.sets = Math.max(2, ex.sets - 1);
    }
  }

  const plan: WorkoutPlan = {
    id: uid(),
    date,
    exercises,
    status: 'planned',
    notes: deload ? 'Deload: сниженная нагрузка' : undefined,
  };
  await db.workoutPlans.put(plan);
  return plan;
}

export async function getTodayWorkoutPlan(date = todayKey()): Promise<WorkoutPlan | undefined> {
  const plans = await db.workoutPlans.where('date').equals(date).toArray();
  return plans.sort((a, b) => b.id.localeCompare(a.id))[0];
}

export async function getWorkoutPlanByKind(
  kind: WorkoutKind,
  date = todayKey()
): Promise<WorkoutPlan | undefined> {
  const plans = await db.workoutPlans
    .where('date')
    .equals(date)
    .filter((p) => p.kind === kind && p.status !== 'completed')
    .toArray();
  return plans.sort((a, b) => b.id.localeCompare(a.id))[0];
}

function shufflePick<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

async function plannedFromCatalog(
  ex: CatalogExercise,
  sets: number,
  restOverride?: number
): Promise<PlannedExercise> {
  const measure = ex.measure;
  const targets = await suggestTargetForExercise(
    ex.id,
    measure,
    ex.defaultTargetReps ?? 8,
    ex.defaultTargetSec ?? 30
  );
  const mods = await getFoundationLoadModifiers();
  const cappedSets = clampSets(Math.max(1, Math.round(sets * mods.volumeMultiplier)));
  return {
    exerciseId: ex.id,
    sets: cappedSets,
    targetReps: targets.targetReps,
    targetSeconds: targets.targetSeconds,
    measure,
    restSec: restOverride ?? ex.defaultRestSec,
  };
}

export async function buildHiftPlanLocal(date = todayKey()): Promise<WorkoutPlan> {
  const mods = await getFoundationLoadModifiers();
  let exercises = buildPlannedFromTemplate(LOCAL_HIFT);
  exercises = applyLoadCapToPlanned(exercises, mods.volumeMultiplier);
  const rounds = mods.deload ? 2 : 3;

  const plan: WorkoutPlan = {
    id: uid(),
    date,
    kind: 'hift',
    structure: 'circuit',
    rounds,
    roundRestSec: mods.deload ? 150 : 120,
    circuitExerciseIds: LOCAL_HIFT.map((e) => e.exerciseId),
    exercises,
    status: 'planned',
    notes: mods.deload
      ? `Фиксированный HIFT (deload ×${mods.volumeMultiplier.toFixed(2)})`
      : 'Фиксированный HIFT (без ИИ)',
  };
  await db.workoutPlans.put(plan);
  return plan;
}

export async function buildGppPlanLocal(
  subtype: GppSubtype,
  date = todayKey()
): Promise<WorkoutPlan> {
  const kind = gppKindFromSubtype(subtype);
  const template = getLocalTemplate(subtype);
  const mods = await getFoundationLoadModifiers();
  let exercises = buildPlannedFromTemplate(template);
  exercises = applyLoadCapToPlanned(exercises, mods.volumeMultiplier);

  const plan: WorkoutPlan = {
    id: uid(),
    date,
    kind,
    structure: 'straight_sets',
    gppSubtype: subtype,
    exercises,
    status: 'planned',
    notes: mods.deload
      ? `GPP ${subtype} (deload) · ${templateNotesLabel(template)}`
      : `Фиксированный GPP ${subtype} (без ИИ) · ${templateNotesLabel(template)}`,
  };
  await db.workoutPlans.put(plan);
  return plan;
}

export async function buildWarmupPlanLocal(date = todayKey()): Promise<WorkoutPlan> {
  const levels = await getFitnessLevels();
  const tier = tierForWorkoutKind(levels, 'warmup');
  const picked = shufflePick(getExercisesForKind('warmup', tier), 8);
  const exercises = await Promise.all(picked.map((e) => plannedFromCatalog(e, 1, e.defaultRestSec)));

  const plan: WorkoutPlan = {
    id: uid(),
    date,
    kind: 'warmup',
    structure: 'straight_sets',
    exercises,
    status: 'planned',
    notes: 'Локальная зарядка',
  };
  await db.workoutPlans.put(plan);
  return plan;
}

export async function buildStretchPlanLocal(date = todayKey()): Promise<WorkoutPlan> {
  const levels = await getFitnessLevels();
  const tier = tierForWorkoutKind(levels, 'stretch');
  const picked = shufflePick(getExercisesForKind('stretch', tier), 8);
  const exercises = await Promise.all(picked.map((e) => plannedFromCatalog(e, 1, 10)));

  const plan: WorkoutPlan = {
    id: uid(),
    date,
    kind: 'stretch',
    structure: 'straight_sets',
    exercises,
    status: 'planned',
    notes: 'Локальная растяжка',
  };
  await db.workoutPlans.put(plan);
  return plan;
}

export async function ensureTodayWorkoutPlan(): Promise<WorkoutPlan> {
  const existing = await getTodayWorkoutPlan();
  if (existing && existing.status !== 'completed') return existing;
  return buildWorkoutPlan();
}

export function workoutTaskKey(): string {
  return TASK_KEYS.foundationWorkout;
}

export interface DirectorPlanPayload {
  exercises: unknown[];
  kind?: WorkoutKind;
  structure?: WorkoutPlan['structure'];
  rounds?: number;
  roundRestSec?: number;
  circuitExerciseIds?: string[];
  gppSubtype?: GppSubtype;
  notes?: string;
}

export async function applyWorkoutPlanFromDirector(
  rawExercises: unknown[],
  date = todayKey(),
  meta: Omit<DirectorPlanPayload, 'exercises'> = {}
): Promise<WorkoutPlan> {
  const kind = meta.kind ?? 'legacy';
  const levels = await getFitnessLevels();
  const tier = tierForWorkoutKind(levels, kind);
  const allowed = new Set(
    kind === 'legacy'
      ? BAR_EXERCISES.map((e) => e.id)
      : getExercisesForKind(kind, tier).map((e) => e.id)
  );

  const exercises: PlannedExercise[] = [];
  for (const raw of rawExercises) {
    if (!raw || typeof raw !== 'object') continue;
    const ex = raw as Record<string, unknown>;
    const exerciseId = String(ex.exerciseId ?? '');
    if (!allowed.has(exerciseId)) continue;
    const catalog = getCatalogExerciseById(exerciseId);
    const measure =
      (ex.measure as PlannedExercise['measure']) ??
      catalog?.measure ??
      ('reps' as const);
    const targetSeconds =
      ex.targetSeconds != null ? Number(ex.targetSeconds) : catalog?.defaultTargetSec;
    const targetReps =
      ex.targetReps != null
        ? Number(ex.targetReps)
        : measure === 'seconds'
          ? targetSeconds ?? 30
          : Number(ex.targetReps) || catalog?.defaultTargetReps || 8;

    exercises.push({
      exerciseId,
      sets: clampSets(Number(ex.sets) || 3),
      targetReps: Math.max(1, targetReps),
      targetSeconds: targetSeconds ?? (measure === 'seconds' ? targetReps : undefined),
      measure,
      restSec: Math.max(0, Number(ex.restSec) ?? catalog?.defaultRestSec ?? 60),
    });
  }

  if (exercises.length === 0) {
    if (kind === 'hift') return buildHiftPlanLocal(date);
    if (kind.startsWith('gpp_') && meta.gppSubtype) return buildGppPlanLocal(meta.gppSubtype, date);
    if (kind === 'warmup') return buildWarmupPlanLocal(date);
    if (kind === 'stretch') return buildStretchPlanLocal(date);
    return buildWorkoutPlan(date);
  }

  const existing = await getWorkoutPlanByKind(kind, date);
  const plan: WorkoutPlan = {
    id: existing?.id ?? uid(),
    date,
    exercises,
    status: 'planned',
    kind,
    structure: meta.structure ?? (kind === 'hift' ? 'circuit' : 'straight_sets'),
    rounds: meta.rounds ?? (kind === 'hift' ? 3 : undefined),
    roundRestSec: meta.roundRestSec ?? (kind === 'hift' ? 120 : undefined),
    circuitExerciseIds: meta.circuitExerciseIds,
    gppSubtype: meta.gppSubtype,
    notes: meta.notes ?? 'План от DIRECTOR',
  };
  await db.workoutPlans.put(plan);
  return plan;
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<void> {
  await db.workoutPlans.put(plan);
}
