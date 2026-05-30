import type {
  OperatorProfile,
  PersonalDevelopmentPlan,
  ReadinessScores,
  StageGateEvaluation,
  StageId,
  StageProgressState,
} from '../domain/types';
import { STAGE_LABELS } from '../domain/types';
import { getIntegrationParams } from './integration-params';
import {
  computeSynergyGap,
  computeSynergyIndex,
  getSynergySummary,
  type IntegrationOpsSummary,
} from './integration-metrics';
import { INTEGRATION_THRESHOLDS as T } from './integration-thresholds';
import { STAGE_TASK_KEYS, TASK_KEYS } from '@/content/task-keys';

export interface IntegrationDirective {
  calculationLine: string;
  actionLine: string;
  denyLine?: string;
}

const STAGE_ANCHOR: Record<StageId, string> = {
  foundation: STAGE_TASK_KEYS.foundation.anchor,
  regulation: STAGE_TASK_KEYS.regulation.anchor,
  mind: STAGE_TASK_KEYS.mind.anchor,
  influence: STAGE_TASK_KEYS.influence.anchor,
};

export async function buildIntegrationDirective(input: {
  readiness: ReadinessScores;
  ops: IntegrationOpsSummary;
  profile: OperatorProfile;
  progress: StageProgressState;
  pdp: PersonalDevelopmentPlan | null;
  gateEval?: StageGateEvaluation | null;
}): Promise<IntegrationDirective> {
  const { readiness, ops, profile: _profile, progress, pdp, gateEval } = input;
  const params = await getIntegrationParams();
  const synergy = getSynergySummary(readiness);
  const gap = computeSynergyGap(readiness);
  const synergyIndex = computeSynergyIndex(readiness);
  const delta = ops.readinessDelta7d;
  const auditDebt = Math.max(
    0,
    (ops.daysSinceAudit ?? params.auditIntervalDaysEma + 1) - Math.round(params.auditIntervalDaysEma)
  );
  const pdpAligned =
    pdp?.focusStage && synergy.hasBottleneck
      ? pdp.focusStage === synergy.weakestStage
      : null;

  const calcParts = [
    `global=${readiness.global}`,
    `synergy_index=${synergyIndex}`,
    `gap=${gap}`,
    synergy.hasBottleneck
      ? `bottleneck=${synergy.weakestStage}:${synergy.bottleneck}`
      : 'bottleneck=balanced',
    `Δ7d_f=${delta.foundation}`,
    `Δ7d_r=${delta.regulation}`,
    `compliance=${ops.complianceAvg7d}%/tgt${Math.round(params.complianceTargetEma)}`,
    `debrief=${ops.debriefRate7d}%/tgt${Math.round(params.debriefTargetEma)}`,
    ops.daysSinceAudit != null ? `audit=${ops.daysSinceAudit}d` : 'audit=never',
    `pdp=${ops.pdpCompletionPct}%`,
    pdpAligned != null ? `pdp_align=${pdpAligned ? 1 : 0}` : null,
    gateEval ? `soft=${gateEval.softScore}` : null,
    gateEval ? `qual=${gateEval.qualifyingDays}/${gateEval.qualifyingRequired}` : null,
  ].filter(Boolean);

  let action: string;
  let denyLine: string | undefined;

  if (progress.pendingDemotion) {
    const target = progress.pendingDemotion;
    action = `Подтвердить demotion → ${STAGE_LABELS[target]}; 3× ${STAGE_ANCHOR[target]} (7д).`;
    denyLine = '[ОТКАЗ] Расширение верхних этапов до стабилизации базы.';
  } else if (auditDebt > 0 || ops.daysSinceAudit == null) {
    action = `Выполнить ${TASK_KEYS.integrationWeeklyAudit} (audit debt ${auditDebt > 0 ? auditDebt : '∞'}д).`;
  } else if (synergy.hasBottleneck && synergy.bottleneck < T.bottleneckDegraded) {
    const anchor = STAGE_ANCHOR[synergy.weakestStage];
    action = `Приоритет ${anchor} ×3/7д; отложить influence.mi и mind.scenario.`;
    denyLine = '[ОТКАЗ] Верхние этапы: bottleneck degraded (<40).';
  } else if (pdpAligned === false && synergy.hasBottleneck) {
    action = `${TASK_KEYS.integrationPdpReview}: focusStage → ${synergy.weakestStage}.`;
  } else if (ops.complianceAvg7d < params.complianceTargetEma) {
    action = `${TASK_KEYS.debrief} + ${TASK_KEYS.briefing} ежедневно (compliance ниже EMA ${Math.round(params.complianceTargetEma)}%).`;
  } else if (ops.debriefRate7d < params.debriefTargetEma) {
    action = `${TASK_KEYS.debrief} 7/7; compliance уже в норме.`;
  } else if (progress.pendingAdvance && gateEval) {
    action = `Gate advance → ${gateEval.toStage}; закрыть blockers: ${gateEval.reasons.slice(0, 2).join('; ') || 'готово'}.`;
  } else if (synergy.hasBottleneck) {
    action = `Усилить ${STAGE_ANCHOR[synergy.weakestStage]}; global=${readiness.global} — без расширения scope.`;
  } else {
    action = 'Система сбалансирована — удержать текущий ритм; следующий слот по COMMAND.';
  }

  if (progress.advanceSnoozeUntil && progress.advanceSnoozeUntil >= new Date().toISOString().slice(0, 10)) {
    denyLine = denyLine
      ? `${denyLine} Advance snoozed.`
      : '[ОТКАЗ] Advance snoozed до конца недели.';
  }

  return {
    calculationLine: `[РАСЧЁТ] ${calcParts.join(' · ')}`,
    actionLine: `[ДЕЙСТВИЕ] ${action}`,
    denyLine,
  };
}

export function formatIntegrationDirectiveForPrompt(d: IntegrationDirective): string {
  return [d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n');
}
