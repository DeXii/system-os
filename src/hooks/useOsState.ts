import { useCallback, useEffect, useState } from 'react';
import { db } from '@/core/db';
import { computeReadiness } from '@/core/engines/readiness';
import { getModuleStatuses } from '@/core/engines/stage-gates';
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

export function useOsState() {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [readiness, setReadiness] = useState<ReadinessScores>({
    foundation: 0,
    regulation: 0,
    mind: 0,
    influence: 0,
    global: 0,
  });
  const [moduleStatuses, setModuleStatuses] = useState<Record<ModuleId, ModuleStatus>>({
    command: 'active',
    foundation: 'active',
    regulation: 'active',
    mind: 'active',
    influence: 'active',
    library: 'active',
    integration: 'active',
    director: 'active',
    archive: 'active',
  });
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const p = await db.operator.toCollection().first();
    const r = await computeReadiness();
    const statuses = getModuleStatuses(r);
    const ev = await getRecentEvents(30);
    setProfile(p ?? null);
    setReadiness(r);
    setModuleStatuses(statuses);
    setEvents(ev);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const unsubKernel = subscribeKernel(() => refresh());
    const unsubRefresh = subscribeOsRefresh(() => refresh());
    return () => {
      unsubKernel();
      unsubRefresh();
    };
  }, [refresh]);

  return { profile, readiness, moduleStatuses, events, loading, refresh };
}
