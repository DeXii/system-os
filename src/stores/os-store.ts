import { create } from 'zustand';
import { db } from '@/core/db';
import { getReadiness } from '@/core/engines/readiness';
import { getModuleStatuses } from '@/core/engines/stage-gates';
import { computeOperatorMode } from '@/core/engines/operator-mode';
import { buildTodayQueue } from '@/core/engines/week-schedule';
import { todayKey } from '@/core/db';
import {
  subscribeKernel,
  subscribeOsRefresh,
  getRecentEvents,
} from '@/core/events/event-bus';
import type {
  ModuleId,
  ModuleStatus,
  OperatorProfile,
  ReadinessScores,
  SystemEvent,
} from '@/core/domain/types';
import type { OperatorMode } from '@/core/engines/operator-mode';
import type { ScheduleSlot } from '@/core/domain/types';

interface OsStoreState {
  profile: OperatorProfile | null;
  readiness: ReadinessScores;
  moduleStatuses: Record<ModuleId, ModuleStatus>;
  operatorMode: OperatorMode | null;
  todayQueue: ScheduleSlot[];
  events: SystemEvent[];
  loading: boolean;
  hydrate: () => Promise<void>;
  invalidate: () => void;
}

const defaultReadiness: ReadinessScores = {
  foundation: 0,
  regulation: 0,
  mind: 0,
  influence: 0,
  global: 0,
};

const defaultModuleStatuses: Record<ModuleId, ModuleStatus> = {
  command: 'active',
  foundation: 'active',
  nutrition: 'active',
  regulation: 'active',
  mind: 'active',
  influence: 'active',
  library: 'active',
  integration: 'active',
  director: 'active',
  prompt: 'active',
  archive: 'active',
};

let wired = false;
let hydrateGeneration = 0;

function profileContentEqual(
  a: OperatorProfile | null,
  b: OperatorProfile | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.currentStage === b.currentStage &&
    a.onboarded === b.onboarded &&
    JSON.stringify(a.unlockedStages) === JSON.stringify(b.unlockedStages)
  );
}

export const useOsStore = create<OsStoreState>((set, get) => ({
  profile: null,
  readiness: defaultReadiness,
  moduleStatuses: defaultModuleStatuses,
  operatorMode: null,
  todayQueue: [],
  events: [],
  loading: true,

  hydrate: async () => {
    const gen = ++hydrateGeneration;
    const p = await db.operator.toCollection().first();
    const r = await getReadiness();
    const statuses = getModuleStatuses(r);
    const mode = await computeOperatorMode(r);
    const queue = await buildTodayQueue(todayKey());
    const ev = await getRecentEvents(30);
    if (gen !== hydrateGeneration) return;
    const prev = get().profile;
    const nextProfile = p ?? null;
    set({
      profile: profileContentEqual(prev, nextProfile) ? prev : nextProfile,
      readiness: r,
      moduleStatuses: statuses,
      operatorMode: mode,
      todayQueue: queue,
      events: ev,
      loading: false,
    });
  },

  invalidate: () => {
    void get().hydrate();
  },
}));

export function wireOsStoreSubscriptions(): () => void {
  if (wired) return () => {};
  wired = true;
  const store = useOsStore.getState();
  void store.hydrate();
  const u1 = subscribeKernel(() => store.invalidate());
  const u2 = subscribeOsRefresh(() => store.invalidate());
  let u3 = () => {};
  void import('@/core/sync/tab-sync').then((tabSync) => {
    u3 = tabSync.subscribeTabRefresh(() => store.invalidate());
  });
  return () => {
    u1();
    u2();
    u3();
    wired = false;
  };
}
