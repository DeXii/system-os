import { useCallback, useEffect, useState } from 'react';
import { getReadiness } from '@/core/engines/readiness';
import { shouldThrottleCognitiveLoad } from '@/core/engines/mind-metrics';
import { getDegradedMessage } from '@/core/engines/stage-gates';
import type { ModuleStatus } from '@/core/domain/types';
import { StageBooksWidget } from '@/modules/library/components/StageBooksWidget';
import { ChessGoJournalPanel } from './components/ChessGoJournalPanel';
import { ChessGoHistory } from './components/ChessGoHistory';
import { DecisionLogPanel } from './components/DecisionLogPanel';
import { StudyLogPanel } from './components/StudyLogPanel';
import { MetacognitionPanel } from './components/MetacognitionPanel';
import { MindDirectorPanel } from './components/MindDirectorPanel';
import { MindOpsSummary } from './components/MindOpsSummary';
import { SwotScenarioPanel } from './components/SwotScenarioPanel';
import { ModuleShell } from '@/ui/shell/ModuleShell';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
  onOpenLibrary?: () => void;
}

export function MindModule({ moduleStatus, onRefresh, onOpenLibrary }: Props) {
  const [throttleHint, setThrottleHint] = useState<string | null>(null);

  const loadThrottle = useCallback(async () => {
    const r = await getReadiness();
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
      <ModuleShell
        title="MIND"
        subtitle="STG-3 · COGNITIVE OPS"
        chips={
          <>
            {degraded && <span className="tag warn">DEGRADED</span>}
            {throttleHint && <span className="tag warn">THROTTLE</span>}
          </>
        }
      />
      {degraded && <div className="alert-banner">{degraded}</div>}
      {throttleHint && <div className="alert-banner">{throttleHint}</div>}

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

      <div className="grid-2">
        <DecisionLogPanel onSaved={handleActivity} />
        <StudyLogPanel onSaved={handleActivity} />
      </div>
      <MindDirectorPanel onApplied={handleActivity} />
    </div>
  );
}
