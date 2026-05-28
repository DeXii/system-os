import { useEffect } from 'react';
import { useOsStore, wireOsStoreSubscriptions } from '@/stores/os-store';

export function useOsState() {
  const profile = useOsStore((s) => s.profile);
  const readiness = useOsStore((s) => s.readiness);
  const moduleStatuses = useOsStore((s) => s.moduleStatuses);
  const events = useOsStore((s) => s.events);
  const loading = useOsStore((s) => s.loading);
  const hydrate = useOsStore((s) => s.hydrate);

  useEffect(() => {
    const unsub = wireOsStoreSubscriptions();
    return unsub;
  }, []);

  return {
    profile,
    readiness,
    moduleStatuses,
    events,
    loading,
    refresh: hydrate,
  };
}
