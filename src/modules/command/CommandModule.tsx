import { useCallback, useEffect, useState } from 'react';
import { db, todayKey, uid } from '@/core/db';
import {
  getOrCreateDayReport,
  getTodayCompliance,
  markBriefingDone,
  markDebriefDone,
  refreshDayReportCompliance,
  type ComplianceSnapshot,
} from '@/core/engines/command-compliance';
import { ensureDayBootstrapped } from '@/core/engines/os-kernel';
import { applyAiActions } from '@/core/ai/director-service';
import { ActionCards } from '@/modules/director/components/ActionCards';
import { getRuleHints } from '@/core/engines/readiness';
import {
  confirmStageAdvance,
  confirmStageDemotion,
  evaluateStageProgression,
  getStageProgress,
} from '@/core/engines/stage-progression';
import { emitKernel } from '@/core/events/event-bus';
import type {
  AiInsight,
  DayReport,
  Mission,
  OperatorProfile,
  ProtocolItem,
  ReadinessScores,
  StageProgressState,
} from '@/core/domain/types';
import { AlertsPanel } from './components/AlertsPanel';
import { CommandHeader } from './components/CommandHeader';
import { DayPhase } from './components/DayPhase';
import { DirectorInline, runCommandDirectorTask } from './components/DirectorInline';
import { EveningPhase } from './components/EveningPhase';
import { MorningPhase } from './components/MorningPhase';
import { StageOverview } from './components/StageOverview';
import { StageTransitionBanner } from './components/StageTransitionBanner';
import { WeekSchedulePanel } from './components/WeekSchedulePanel';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  profile: OperatorProfile | null;
  readiness: ReadinessScores;
  onRefresh: () => void;
  onOpenIntegration?: () => void;
}

export function CommandModule({ profile, readiness, onRefresh, onOpenIntegration }: Props) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [protocol, setProtocol] = useState<ProtocolItem[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [dayReport, setDayReport] = useState<DayReport | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSnapshot>({
    protocolPct: 0,
    missionPct: 0,
    compliance: 0,
  });
  const [progress, setProgress] = useState<StageProgressState | null>(null);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [directorOutput, setDirectorOutput] = useState('');
  const [lastInsight, setLastInsight] = useState<AiInsight | null>(null);
  const [eveningNotes, setEveningNotes] = useState('');
  const [localProfile, setLocalProfile] = useState(profile);
  const today = todayKey();

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const load = useCallback(async () => {
    if (localProfile) {
      await ensureDayBootstrapped(localProfile, today);
      const evaluated = await evaluateStageProgression(localProfile);
      setProgress(evaluated);
    } else {
      setProgress(await getStageProgress());
    }
    setMissions(await db.missions.where('date').equals(today).toArray());
    setProtocol(await db.protocolItems.where('date').equals(today).toArray());
    setHints(await getRuleHints());
    const report = await getOrCreateDayReport(today);
    setDayReport(report);
    setEveningNotes(report.eveningNotes ?? '');
    setCompliance(await getTodayCompliance(today));
  }, [localProfile, today]);

  useEffect(() => {
    load();
  }, [load]);

  const afterDataChange = async () => {
    await refreshDayReportCompliance(today);
    setCompliance(await getTodayCompliance(today));
    const report = await db.dayReports.where('date').equals(today).first();
    setDayReport(report ?? null);
    load();
    onRefresh();
  };

  const toggleMission = async (m: Mission) => {
    const status = m.status === 'done' ? 'pending' : 'done';
    await db.missions.update(m.id, { status });
    if (status === 'done') await emitKernel('command', `Миссия: ${m.title}`, 'success');
    await afterDataChange();
  };

  const toggleProtocol = async (p: ProtocolItem) => {
    await db.protocolItems.update(p.id, { done: !p.done });
    await afterDataChange();
  };

  const runBriefing = async () => {
    await runCommandDirectorTask(
      'morningBriefing',
      setDirectorLoading,
      setDirectorOutput,
      setLastInsight,
      async () => {
        await markBriefingDone(today);
        await afterDataChange();
      }
    );
  };

  const runDebrief = async () => {
    await runCommandDirectorTask(
      'eveningDebrief',
      setDirectorLoading,
      setDirectorOutput,
      setLastInsight,
      async () => {
        await markDebriefDone(today, eveningNotes);
        await afterDataChange();
      }
    );
  };

  const runWeeklyAudit = async () => {
    await runCommandDirectorTask(
      'weeklyAudit',
      setDirectorLoading,
      setDirectorOutput,
      setLastInsight,
      () => afterDataChange()
    );
  };

  const applyDirectorActions = async (selected = lastInsight?.actions ?? []) => {
    if (!selected.length) return;
    await applyAiActions(selected);
    await emitKernel('command', 'DIRECTOR actions applied', 'success');
    await afterDataChange();
  };

  const quickCapture = async () => {
    const note = prompt('Состояние (10 сек):');
    if (!note) return;
    await db.dailyLogs.put({
      id: uid(),
      date: today,
      notes: note,
      stressLevel: 5,
    });
    await emitKernel('command', 'Quick capture', 'info');
    await afterDataChange();
  };

  if (!localProfile) {
    return <p>Оператор не откалиброван. Перезагрузите после onboarding.</p>;
  }

  return (
    <div>
      <CommandHeader profile={localProfile} readiness={readiness} dayReport={dayReport} />
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          COMMAND: morning phase (briefing) и evening phase (debrief), compliance по mission и
          protocol, alerts от readiness.
        </p>
      </GlossaryZone>
      <AlertsPanel hints={hints} />
      <StageTransitionBanner
        pendingAdvance={progress?.pendingAdvance}
        pendingDemotion={progress?.pendingDemotion}
        onAcceptAdvance={async () => {
          const updated = await confirmStageAdvance(localProfile, true);
          setLocalProfile(updated);
          await afterDataChange();
        }}
        onSnoozeAdvance={async () => {
          await confirmStageAdvance(localProfile, false);
          await afterDataChange();
        }}
        onAcceptDemotion={async () => {
          const updated = await confirmStageDemotion(localProfile, true);
          setLocalProfile(updated);
          await afterDataChange();
        }}
        onSnoozeDemotion={async () => {
          await confirmStageDemotion(localProfile, false);
          await afterDataChange();
        }}
      />
      {(progress?.pendingAdvance || progress?.pendingDemotion) && onOpenIntegration && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginBottom: '1rem' }}
          onClick={onOpenIntegration}
        >
          Полное управление → INTEGRATION
        </button>
      )}

      <WeekSchedulePanel onChanged={afterDataChange} />

      <MorningPhase
        protocol={protocol}
        briefingDone={dayReport?.briefingDone ?? false}
        directorLoading={directorLoading}
        onToggleProtocol={toggleProtocol}
        onBriefing={runBriefing}
        onQuickCapture={quickCapture}
      />

      {directorOutput && (
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <div className="panel-title">DIRECTOR — последний ответ</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{directorOutput}</pre>
          {lastInsight && lastInsight.actions.length > 0 && (
            <ActionCards
              actions={lastInsight.actions}
              loading={directorLoading}
              onApply={applyDirectorActions}
            />
          )}
        </div>
      )}

      <DayPhase
        missions={missions}
        currentStage={localProfile.currentStage}
        onToggleMission={toggleMission}
      />

      <EveningPhase
        compliance={compliance}
        debriefDone={dayReport?.debriefDone ?? false}
        eveningNotes={eveningNotes}
        directorLoading={directorLoading}
        onNotesChange={setEveningNotes}
        onDebrief={runDebrief}
      />

      <div className="panel">
        <div className="panel-title">DIRECTOR Ops</div>
        <button
          type="button"
          className="btn btn-sm"
          disabled={directorLoading}
          onClick={runWeeklyAudit}
        >
          Weekly audit (быстро)
        </button>
        {onOpenIntegration && (
          <button
            type="button"
            className="btn btn-sm"
            style={{ marginLeft: 8 }}
            onClick={onOpenIntegration}
          >
            Полный аудит → INTEGRATION
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginLeft: 8 }}
          disabled={directorLoading}
          onClick={() =>
            runCommandDirectorTask(
              'rescheduleDay',
              setDirectorLoading,
              setDirectorOutput,
              setLastInsight,
              afterDataChange
            )
          }
        >
          Reschedule day
        </button>
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginLeft: 8 }}
          disabled={directorLoading}
          onClick={() =>
            runCommandDirectorTask(
              'buildWeekSchedule',
              setDirectorLoading,
              setDirectorOutput,
              setLastInsight,
              afterDataChange
            )
          }
        >
          Build week
        </button>
      </div>

      <DirectorInline onApplied={afterDataChange} />

      {progress && <StageOverview profile={localProfile} progress={progress} />}
    </div>
  );
}
