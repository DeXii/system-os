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
    description: 'План тренировки + set_workout_plan',
    core: true,
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
