import { useCallback } from 'react';
import { STAGES } from '@/content/stages';
import type { ModuleId, OperatorProfile, ReadinessScores } from '@/core/domain/types';
import { IntegrationDirectorPanel } from './components/IntegrationDirectorPanel';
import { IntegrationOpsSummary } from './components/IntegrationOpsSummary';
import { PdpPanel } from './components/PdpPanel';
import { PyramidPanel } from './components/PyramidPanel';
import { StageProgressionPanel } from './components/StageProgressionPanel';
import { SynergyPanel } from './components/SynergyPanel';
import { WeeklyAuditPanel } from './components/WeeklyAuditPanel';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  profile: OperatorProfile | null;
  readiness: ReadinessScores;
  onRefresh: () => void;
  onNavigateModule?: (id: ModuleId) => void;
}

export function IntegrationModule({
  profile,
  readiness,
  onRefresh,
  onNavigateModule,
}: Props) {
  const handleActivity = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  if (!profile) {
    return <p>Оператор не откалиброван.</p>;
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--mono)', marginBottom: '0.5rem' }}>
        INTEGRATION — Системная синергия
      </h1>
      <GlossaryZone>
        <p style={{ fontSize: 13, color: 'var(--accent)', marginBottom: '1rem' }}>
          Integration: pyramid, synergy, bottleneck, PDP, stage progression и weekly audit — связка
          readiness всех этапов. Фокус: этап {STAGES.find((s) => s.id === profile.currentStage)?.number ?? '—'}.
        </p>
      </GlossaryZone>

      <IntegrationOpsSummary readiness={readiness} onRefresh={handleActivity} />

      <div className="grid-2">
        <PyramidPanel
          readiness={readiness}
          currentStageId={profile.currentStage}
          onNavigateModule={onNavigateModule}
        />
        <SynergyPanel readiness={readiness} />
      </div>

      <StageProgressionPanel profile={profile} onRefresh={handleActivity} />
      <PdpPanel profile={profile} onSaved={handleActivity} />
      <WeeklyAuditPanel onSaved={handleActivity} />
      <IntegrationDirectorPanel onApplied={handleActivity} />
    </div>
  );
}
