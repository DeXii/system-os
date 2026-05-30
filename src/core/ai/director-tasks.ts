import type { ModuleId } from '../domain/types';

export type TaskCategory = 'command' | 'system' | 'coach' | 'utility' | 'extended';

export interface DirectorTaskMeta {
  id: string;
  label: string;
  category: TaskCategory;
  defaultScope: ModuleId | 'full';
  description: string;
  core: boolean;
  quick?: boolean;
}

export const DIRECTOR_TASKS = [
  {
    id: 'morningBriefing',
    label: 'Briefing',
    category: 'command',
    defaultScope: 'command',
    description: 'Утренний протокол и миссии',
    core: true,
    quick: true,
  },
  {
    id: 'eveningDebrief',
    label: 'Debrief',
    category: 'command',
    defaultScope: 'command',
    description: 'Вечерний разбор',
    core: true,
    quick: true,
  },
  {
    id: 'weeklyAudit',
    label: 'Weekly Audit',
    category: 'system',
    defaultScope: 'integration',
    description: 'Системный аудит недели',
    core: true,
  },
  {
    id: 'deepAnalysis14d',
    label: 'Анализ · 14 дней',
    category: 'system',
    defaultScope: 'full',
    description: 'Полный системный разбор за 14 календарных дней',
    core: true,
  },
  {
    id: 'deepAnalysis30d',
    label: 'Анализ · 30 дней',
    category: 'system',
    defaultScope: 'full',
    description: 'Полный системный разбор за 30 календарных дней',
    core: true,
  },
  {
    id: 'pdpReview',
    label: 'PDP Review',
    category: 'system',
    defaultScope: 'integration',
    description: 'Разбор Personal Development Plan',
    core: true,
  },
  {
    id: 'stageGateReview',
    label: 'Stage Gate',
    category: 'system',
    defaultScope: 'integration',
    description: 'Gate / demotion план',
    core: true,
  },
  {
    id: 'foundationCoach',
    label: 'Body Coach',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'Bar HIFT / recovery',
    core: true,
    quick: true,
  },
  {
    id: 'planWorkout',
    label: 'Plan Workout',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'Legacy план + set_workout_plan',
    core: false,
  },
  {
    id: 'planHift',
    label: 'Plan HIFT',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'HIFT круг 5–6 × 3',
    core: true,
  },
  {
    id: 'planGpp',
    label: 'Plan GPP',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'GPP push/pull/core/legs',
    core: true,
  },
  {
    id: 'planWarmup',
    label: 'Plan Warmup',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'Утренняя зарядка',
    core: true,
  },
  {
    id: 'planStretch',
    label: 'Plan Stretch',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'Растяжка',
    core: true,
  },
  {
    id: 'planCardioIntense',
    label: 'Cardio Intense',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'Интенсивное кардио',
    core: true,
  },
  {
    id: 'planCardioEasy',
    label: 'Cardio Easy',
    category: 'coach',
    defaultScope: 'foundation',
    description: 'Спокойное кардио',
    core: true,
  },
  {
    id: 'nutritionCoach',
    label: 'Nutrition Coach',
    category: 'coach',
    defaultScope: 'nutrition',
    description: 'Рацион, meal plan, shopping',
    core: true,
    quick: true,
  },
  {
    id: 'regulationCoach',
    label: 'Calm Coach',
    category: 'coach',
    defaultScope: 'regulation',
    description: 'HRV, дыхание, PST',
    core: true,
    quick: true,
  },
  {
    id: 'mindCoach',
    label: 'Mind Coach',
    category: 'coach',
    defaultScope: 'mind',
    description: 'EF, chess, метапознание',
    core: true,
    quick: true,
  },
  {
    id: 'influenceCoach',
    label: 'Influence Coach',
    category: 'coach',
    defaultScope: 'influence',
    description: 'MI, nudge, тактика',
    core: true,
  },
  {
    id: 'libraryCoach',
    label: 'Library Coach',
    category: 'coach',
    defaultScope: 'library',
    description: 'Книга по этапу',
    core: true,
  },
  {
    id: 'freeCommand',
    label: 'Ask',
    category: 'utility',
    defaultScope: 'full',
    description: 'Свободный запрос',
    core: true,
    quick: true,
  },
  {
    id: 'rescheduleDay',
    label: 'Reschedule',
    category: 'extended',
    defaultScope: 'command',
    description: 'Перенос слотов дня',
    core: false,
  },
  {
    id: 'buildWeekSchedule',
    label: 'Week Schedule',
    category: 'extended',
    defaultScope: 'command',
    description: 'График недели Пн–Вс',
    core: false,
  },
  {
    id: 'tacticalDebrief',
    label: 'Tactical Debrief',
    category: 'extended',
    defaultScope: 'mind',
    description: 'Разбор решений',
    core: false,
  },
  {
    id: 'contactBrief',
    label: 'Contact Brief',
    category: 'coach',
    defaultScope: 'influence',
    description: 'Досье и план контакта',
    core: true,
  },
  {
    id: 'preContactSimulation',
    label: 'Pre-Contact Sim',
    category: 'coach',
    defaultScope: 'influence',
    description: 'Репетиция контакта',
    core: false,
  },
  {
    id: 'operationReview',
    label: 'Operation Review',
    category: 'system',
    defaultScope: 'influence',
    description: 'Разбор активной операции',
    core: true,
  },
  {
    id: 'decisionFollowUp',
    label: 'Decision Follow-up',
    category: 'coach',
    defaultScope: 'mind',
    description: 'Закрытие прогнозов решений',
    core: true,
  },
  {
    id: 'doctrineReview',
    label: 'Doctrine Review',
    category: 'system',
    defaultScope: 'command',
    description: 'Сверка с доктриной оператора',
    core: true,
  },
] as const satisfies readonly DirectorTaskMeta[];

export type TaskId = (typeof DIRECTOR_TASKS)[number]['id'];

const TASK_MAP = new Map<string, DirectorTaskMeta>(
  DIRECTOR_TASKS.map((t) => [t.id, t as DirectorTaskMeta])
);

export function getTaskMeta(id: TaskId): DirectorTaskMeta | undefined {
  return TASK_MAP.get(id);
}

export function getCoreTasks(): DirectorTaskMeta[] {
  return DIRECTOR_TASKS.filter((t) => t.core) as DirectorTaskMeta[];
}

export function getQuickTasks(): DirectorTaskMeta[] {
  return DIRECTOR_TASKS.filter((t) => 'quick' in t && t.quick) as DirectorTaskMeta[];
}

export function getTasksForScope(scope: ModuleId | 'full'): DirectorTaskMeta[] {
  if (scope === 'full' || scope === 'director' || scope === 'archive') {
    return getCoreTasks();
  }
  return DIRECTOR_TASKS.filter(
    (t) => t.defaultScope === scope || t.defaultScope === 'full' || t.category === 'command'
  ) as DirectorTaskMeta[];
}

export function getTasksByCategory(): Record<TaskCategory, DirectorTaskMeta[]> {
  const out: Record<TaskCategory, DirectorTaskMeta[]> = {
    command: [],
    system: [],
    coach: [],
    utility: [],
    extended: [],
  };
  for (const t of DIRECTOR_TASKS) {
    out[t.category].push(t as DirectorTaskMeta);
  }
  return out;
}

export function resolveScope(
  taskId: TaskId,
  explicit?: ModuleId | 'full'
): ModuleId | 'full' {
  if (explicit) return explicit;
  const meta = getTaskMeta(taskId);
  return meta?.defaultScope ?? 'command';
}

export type ContextLookbackDays = 7 | 14 | 30;

export function resolveLookbackDays(
  taskId: TaskId,
  explicit?: ContextLookbackDays
): ContextLookbackDays {
  if (explicit) return explicit;
  if (taskId === 'deepAnalysis14d') return 14;
  if (taskId === 'deepAnalysis30d') return 30;
  return 7;
}

export function isDeepAnalysisTask(taskId: TaskId): boolean {
  return taskId === 'deepAnalysis14d' || taskId === 'deepAnalysis30d';
}

const FOUNDATION_PLAN_TASK_IDS = new Set<TaskId>([
  'planHift',
  'planGpp',
  'planWarmup',
  'planStretch',
  'planCardioIntense',
  'planCardioEasy',
  'planWorkout',
]);

export function isFoundationPlanTask(taskId: TaskId): boolean {
  return FOUNDATION_PLAN_TASK_IDS.has(taskId);
}

export function isRegulationCoachTask(taskId: TaskId): boolean {
  return taskId === 'regulationCoach';
}

export function isNutritionCoachTask(taskId: TaskId): boolean {
  return taskId === 'nutritionCoach';
}

export function isInfluenceCoachTask(taskId: TaskId): boolean {
  return taskId === 'influenceCoach';
}

export function isFoundationCardioPlanTask(taskId: TaskId): boolean {
  return taskId === 'planCardioIntense' || taskId === 'planCardioEasy';
}
