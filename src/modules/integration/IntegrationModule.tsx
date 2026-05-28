import { useCallback, useState } from 'react';
import { STAGES } from '@/content/stages';
import type { ModuleId, OperatorProfile, ReadinessScores } from '@/core/domain/types';
import { ModuleShell } from '@/ui/shell/ModuleShell';
import { IntegrationDirectorPanel } from './components/IntegrationDirectorPanel';
import { IntegrationOpsSummary } from './components/IntegrationOpsSummary';
import { PdpPanel } from './components/PdpPanel';
import { PyramidPanel } from './components/PyramidPanel';
import { StageProgressionPanel } from './components/StageProgressionPanel';
import { SynergyPanel } from './components/SynergyPanel';
import { WeeklyAuditPanel } from './components/WeeklyAuditPanel';
import { DoctrinePanel } from './components/DoctrinePanel';

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
  const [mobileTab, setMobileTab] = useState<'overview' | 'stage' | 'audit'>('overview');

  const handleActivity = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  if (!profile) {
    return <p>Оператор не откалиброван.</p>;
  }

  const stageNum = STAGES.find((s) => s.id === profile.currentStage)?.number ?? '—';
  const tabHidden = (tab: typeof mobileTab) =>
    mobileTab !== tab ? ({ 'data-tab-hidden': 'true' } as const) : {};

  return (
    <div>
      <ModuleShell
        title="INTEGRATION"
        subtitle={`SYS SYNERGY · FOCUS STG-${stageNum}`}
      />

      <div className="integration-tabs" role="tablist">
        {(
          [
            ['overview', 'OVERVIEW'],
            ['stage', 'STAGE/PDP'],
            ['audit', 'AUDIT'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`integration-tab ${mobileTab === id ? 'active' : ''}`}
            onClick={() => setMobileTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="integration-section" {...tabHidden('overview')}>
        <IntegrationOpsSummary readiness={readiness} onRefresh={handleActivity} />
        <div className="grid-2">
          <PyramidPanel
            readiness={readiness}
            currentStageId={profile.currentStage}
            onNavigateModule={onNavigateModule}
          />
          <SynergyPanel readiness={readiness} />
        </div>
        <DoctrinePanel onSaved={handleActivity} />
      </div>

      <div className="integration-section" {...tabHidden('stage')}>
        <StageProgressionPanel profile={profile} onRefresh={handleActivity} />
        <PdpPanel profile={profile} onSaved={handleActivity} />
      </div>

      <div className="integration-section" {...tabHidden('audit')}>
        <WeeklyAuditPanel onSaved={handleActivity} />
        <IntegrationDirectorPanel onApplied={handleActivity} />
      </div>
    </div>
  );
}
