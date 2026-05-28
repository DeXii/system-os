import { useCallback, useEffect, useState } from 'react';
import { getReadiness } from '@/core/engines/readiness';
import { shouldThrottleInfluence } from '@/core/engines/influence-metrics';
import { getDegradedMessage } from '@/core/engines/stage-gates';
import type { ModuleStatus } from '@/core/domain/types';
import { StageBooksWidget } from '@/modules/library/components/StageBooksWidget';
import { BiasLogPanel } from './components/BiasLogPanel';
import { InfluenceDirectorPanel } from './components/InfluenceDirectorPanel';
import { InfluenceJournalFeed } from './components/InfluenceJournalFeed';
import { InfluenceOpsSummary } from './components/InfluenceOpsSummary';
import { InfluenceProtocolPanel } from './components/InfluenceProtocolPanel';
import { MiJournalPanel } from './components/MiJournalPanel';
import { NudgeJournalPanel } from './components/NudgeJournalPanel';
import { ObservationDebriefPanel } from './components/ObservationDebriefPanel';
import { ContactsPanel } from './components/ContactsPanel';
import { OperationsPanel } from './components/OperationsPanel';
import { PreContactPanel } from './components/PreContactPanel';
import { ModuleShell } from '@/ui/shell/ModuleShell';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
  onOpenLibrary?: () => void;
}

export function InfluenceModule({ moduleStatus, onRefresh, onOpenLibrary }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [throttleHint, setThrottleHint] = useState<string | null>(null);

  const loadThrottle = useCallback(async () => {
    const r = await getReadiness();
    if (shouldThrottleInfluence(r)) {
      setThrottleHint(
        'Degraded: укрепите FOUNDATION / REGULATION / MIND — приоритет Protocol и короткое Observation.'
      );
    } else {
      setThrottleHint(null);
    }
  }, []);

  useEffect(() => {
    loadThrottle();
  }, [loadThrottle]);

  const handleActivity = () => {
    setRefreshKey((k) => k + 1);
    loadThrottle();
    onRefresh();
  };

  const degraded = moduleStatus === 'degraded' ? getDegradedMessage('influence') : null;

  return (
    <div>
      <ModuleShell
        title="INFLUENCE"
        subtitle="STG-4 · CLASS TACTICS"
        chips={
          <>
            {degraded && <span className="tag warn">DEGRADED</span>}
            {throttleHint && <span className="tag warn">THROTTLE</span>}
          </>
        }
      />
      {degraded && <div className="alert-banner">{degraded}</div>}
      {throttleHint && <div className="alert-banner">{throttleHint}</div>}

      <InfluenceOpsSummary onRefresh={handleActivity} />
      <StageBooksWidget level={4} onOpenLibrary={onOpenLibrary} />

      <div className="grid-2">
        <ContactsPanel onSaved={handleActivity} />
        <OperationsPanel onSaved={handleActivity} />
      </div>

      <PreContactPanel onSaved={handleActivity} />

      <div className="grid-2">
        <InfluenceProtocolPanel onSaved={handleActivity} />
        <MiJournalPanel onSaved={handleActivity} />
      </div>

      <div className="grid-2">
        <NudgeJournalPanel onSaved={handleActivity} />
        <BiasLogPanel onSaved={handleActivity} />
      </div>

      <ObservationDebriefPanel onSaved={handleActivity} />
      <InfluenceJournalFeed refreshKey={refreshKey} />
      <InfluenceDirectorPanel onApplied={handleActivity} />
    </div>
  );
}
