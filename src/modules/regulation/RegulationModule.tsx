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
import { TriggerLogPanel } from './components/TriggerLogPanel';
import { WimHofLive } from './components/WimHofLive';
import { StageBooksWidget } from '@/modules/library/components/StageBooksWidget';
import { ModuleShell } from '@/ui/shell/ModuleShell';

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
      <ModuleShell
        title="REGULATION"
        subtitle="STG-2 · BASELINE CONTROL"
        chips={degraded ? <span className="tag warn">DEGRADED</span> : undefined}
      />
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
            <div className="text-xs text-dim" style={{ padding: '0.5rem 0' }}>
              SELECT LIVE MODE ↑
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <MindfulnessLive onComplete={handleActivity} />
        <StressLogPanel onSaved={handleActivity} />
      </div>

      <TriggerLogPanel onSaved={handleActivity} />

      <RegulationDirectorPanel onApplied={handleActivity} />
    </div>
  );
}
