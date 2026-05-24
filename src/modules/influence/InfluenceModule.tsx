import { useCallback, useEffect, useState } from 'react';
import { computeReadiness } from '@/core/engines/readiness';
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
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
  onOpenLibrary?: () => void;
}

export function InfluenceModule({ moduleStatus, onRefresh, onOpenLibrary }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [throttleHint, setThrottleHint] = useState<string | null>(null);

  const loadThrottle = useCallback(async () => {
    const r = await computeReadiness();
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
      <h1 style={{ fontFamily: 'var(--mono)', marginBottom: '1rem' }}>
        INFLUENCE — Этап 4 · Тактика класса
      </h1>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          Influence: ethics protocol, MI, nudge, bias log, observation debrief — влияние без
          манипуляций и с опорой на readiness.
        </p>
      </GlossaryZone>
      {degraded && <div className="alert-banner">{degraded}</div>}
      {throttleHint && <div className="alert-banner">{throttleHint}</div>}

      <InfluenceOpsSummary onRefresh={handleActivity} />
      <StageBooksWidget level={4} onOpenLibrary={onOpenLibrary} />

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
