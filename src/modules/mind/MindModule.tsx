import { useCallback, useEffect, useState } from 'react';
import { computeReadiness } from '@/core/engines/readiness';
import { shouldThrottleCognitiveLoad } from '@/core/engines/mind-metrics';
import { getDegradedMessage } from '@/core/engines/stage-gates';
import type { ModuleStatus } from '@/core/domain/types';
import { StageBooksWidget } from '@/modules/library/components/StageBooksWidget';
import { ChessGoJournalPanel } from './components/ChessGoJournalPanel';
import { ChessGoHistory } from './components/ChessGoHistory';
import { DecisionLogPanel } from './components/DecisionLogPanel';
import { MetacognitionPanel } from './components/MetacognitionPanel';
import { MindDirectorPanel } from './components/MindDirectorPanel';
import { MindOpsSummary } from './components/MindOpsSummary';
import { SwotScenarioPanel } from './components/SwotScenarioPanel';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
  onOpenLibrary?: () => void;
}

export function MindModule({ moduleStatus, onRefresh, onOpenLibrary }: Props) {
  const [throttleHint, setThrottleHint] = useState<string | null>(null);

  const loadThrottle = useCallback(async () => {
    const r = await computeReadiness();
    if (shouldThrottleCognitiveLoad(r)) {
      setThrottleHint(
        'Низкий foundation/regulation — приоритет лёгкой когнитивки; тяжёлые SWOT по необходимости.'
      );
    } else {
      setThrottleHint(null);
    }
  }, []);

  useEffect(() => {
    loadThrottle();
  }, [loadThrottle]);

  const handleActivity = () => {
    loadThrottle();
    onRefresh();
  };

  const degraded = moduleStatus === 'degraded' ? getDegradedMessage('mind') : null;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--mono)', marginBottom: '1rem' }}>MIND — Этап 3</h1>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          Mind: chess, go, SWOT, scenario analysis, OODA, PMR, decision log; при cognitive throttle —
          меньше тяжёлой cognitive load.
        </p>
      </GlossaryZone>
      {degraded && <div className="alert-banner">{degraded}</div>}

      <MindOpsSummary onRefresh={handleActivity} />
      <StageBooksWidget level={3} onOpenLibrary={onOpenLibrary} />

      <div className="grid-2">
        <ChessGoJournalPanel onSaved={handleActivity} />
        <ChessGoHistory />
      </div>

      <div className="grid-2">
        <SwotScenarioPanel onSaved={handleActivity} throttleHint={throttleHint} />
        <MetacognitionPanel onSaved={handleActivity} />
      </div>

      <DecisionLogPanel onSaved={handleActivity} />
      <MindDirectorPanel onApplied={handleActivity} />
    </div>
  );
}
