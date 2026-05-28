import { create } from 'zustand';
import { db } from '@/core/db';
import { getReadiness } from '@/core/engines/readiness';
import { getModuleStatuses } from '@/core/engines/stage-gates';
import { computeOperatorMode } from '@/core/engines/operator-mode';
import { buildTodayQueue } from '@/core/engines/week-schedule';
import { todayKey } from '@/core/db';
import {
  subscribeDomainEvent,
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

export const useOsStore = create<OsStoreState>((set, get) => ({
  profile: null,
  readiness: defaultReadiness,
  moduleStatuses: defaultModuleStatuses,
  operatorMode: null,
  todayQueue: [],
  events: [],
  loading: true,

  hydrate: async () => {
    const p = await db.operator.toCollection().first();
    const r = await getReadiness();
    const statuses = getModuleStatuses(r);
    const mode = await computeOperatorMode(r);
    const queue = await buildTodayQueue(todayKey());
    const ev = await getRecentEvents(30);
    set({
      profile: p ?? null,
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
  const u3 = subscribeDomainEvent(() => store.invalidate());
  return () => {
    u1();
    u2();
    u3();
    wired = false;
  };
}
