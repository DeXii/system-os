import { useCallback, useEffect, useState } from 'react';
import { TASK_KEYS } from '@/content/task-keys';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { getDegradedMessage } from '@/core/engines/stage-gates';
import type { ModuleStatus } from '@/core/domain/types';
import { HrvPanel } from './components/HrvPanel';
import { MindfulnessLive } from './components/MindfulnessLive';
import { RegulationDirectorPanel } from './components/RegulationDirectorPanel';
import { RegulationOpsSummary } from './components/RegulationOpsSummary';
import { ResonantBreathLive } from './components/ResonantBreathLive';
import { StressLogPanel } from './components/StressLogPanel';
import { WimHofLive } from './components/WimHofLive';
import { StageBooksWidget } from '@/modules/library/components/StageBooksWidget';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
  onOpenLibrary?: () => void;
}

type LiveTab = 'resonant' | 'wimhof' | null;

export function RegulationModule({ moduleStatus, onRefresh, onOpenLibrary }: Props) {
  const [liveTab, setLiveTab] = useState<LiveTab>(null);
  const [queueHints, setQueueHints] = useState<string[]>([]);

  const loadHints = useCallback(async () => {
    const hints: string[] = [];
    for (const key of [
      TASK_KEYS.regulationHrv,
      TASK_KEYS.regulationBreathingResonant,
      TASK_KEYS.regulationBreathingWimhof,
      TASK_KEYS.regulationMindfulness,
    ]) {
      const slot = await findSlotByTaskKey(key);
      if (slot && slot.status === 'pending') {
        hints.push(`#${slot.rank} COMMAND: ${slot.title}`);
      }
    }
    setQueueHints(hints);
  }, []);

  useEffect(() => {
    loadHints();
  }, [loadHints]);

  const handleActivity = () => {
    loadHints();
    onRefresh();
  };

  const degraded = moduleStatus === 'degraded' ? getDegradedMessage('regulation') : null;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--mono)', marginBottom: '1rem' }}>REGULATION — Этап 2</h1>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          Regulation: HRV monitor, resonant breath, Wim Hof, mindfulness, MMFT, stress log и
          recovery zone при низком baseline.
        </p>
      </GlossaryZone>
      {degraded && <div className="alert-banner">{degraded}</div>}
      {queueHints.length > 0 && (
        <div className="alert-banner" style={{ borderColor: 'var(--accent)' }}>
          {queueHints.join(' · ')}
        </div>
      )}

      <RegulationOpsSummary onRefresh={handleActivity} />
      <StageBooksWidget level={2} onOpenLibrary={onOpenLibrary} />

      <div className="grid-2">
        <HrvPanel onSaved={handleActivity} />
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${liveTab === 'resonant' ? 'btn-primary' : ''}`}
              onClick={() => setLiveTab(liveTab === 'resonant' ? null : 'resonant')}
            >
              Резонанс LIVE
            </button>
            <button
              type="button"
              className={`btn btn-sm ${liveTab === 'wimhof' ? 'btn-primary' : ''}`}
              onClick={() => setLiveTab(liveTab === 'wimhof' ? null : 'wimhof')}
            >
              Wim Hof LIVE
            </button>
          </div>
          {liveTab === 'resonant' && <ResonantBreathLive onComplete={handleActivity} />}
          {liveTab === 'wimhof' && <WimHofLive onComplete={handleActivity} />}
          {!liveTab && (
            <div className="panel">
              <GlossaryZone>
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Resonant breath (~6 вд/мин) или Wim Hof — только если HRV не в recovery zone.
                </p>
              </GlossaryZone>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <MindfulnessLive onComplete={handleActivity} />
        <StressLogPanel onSaved={handleActivity} />
      </div>

      <RegulationDirectorPanel onApplied={handleActivity} />
    </div>
  );
}
