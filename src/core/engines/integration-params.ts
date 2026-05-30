import { db } from '../db';
import type { DayReport, OperatorIntegrationParams } from '../domain/types';
import { INTEGRATION_THRESHOLDS as T } from './integration-thresholds';

const ALPHA_COMPLIANCE = 0.05;
const ALPHA_DEBRIEF = 0.05;
const ALPHA_SYNERGY = 0.08;
const ALPHA_AUDIT = 0.1;

const DEFAULT_PARAMS: OperatorIntegrationParams = {
  id: 'integration-params',
  complianceTargetEma: T.params.complianceTargetDefault,
  debriefTargetEma: T.params.debriefTargetDefault,
  synergyGapTolerance: T.params.synergyGapToleranceDefault,
  auditIntervalDaysEma: T.auditIntervalDays,
  lastUpdated: new Date().toISOString(),
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function getIntegrationParams(): Promise<OperatorIntegrationParams> {
  const row = await db.operatorIntegrationParams.get('integration-params');
  return row ?? { ...DEFAULT_PARAMS, lastUpdated: new Date().toISOString() };
}

export async function saveIntegrationParams(
  patch: Partial<Omit<OperatorIntegrationParams, 'id'>>
): Promise<OperatorIntegrationParams> {
  const current = await getIntegrationParams();
  const next: OperatorIntegrationParams = {
    ...current,
    ...patch,
    id: 'integration-params',
    lastUpdated: new Date().toISOString(),
  };
  await db.operatorIntegrationParams.put(next);
  return next;
}

/** Adaptive compliance/debrief targets from rolling day reports. */
export async function updateIntegrationParamsFromDayReport(
  report: DayReport
): Promise<OperatorIntegrationParams> {
  const current = await getIntegrationParams();

  const complianceTargetEma = clamp(
    (1 - ALPHA_COMPLIANCE) * current.complianceTargetEma + ALPHA_COMPLIANCE * report.compliance,
    T.params.complianceMin,
    T.params.complianceMax
  );

  const debriefTargetEma = clamp(
    (1 - ALPHA_DEBRIEF) * current.debriefTargetEma +
      ALPHA_DEBRIEF * (report.debriefDone ? 100 : 0),
    T.params.debriefMin,
    T.params.debriefMax
  );

  return saveIntegrationParams({ complianceTargetEma, debriefTargetEma });
}

/** After weekly audit — tighten/relax synergy gap tolerance from readiness spread. */
export async function updateIntegrationParamsFromAudit(synergyGap: number): Promise<OperatorIntegrationParams> {
  const current = await getIntegrationParams();
  const synergyGapTolerance = clamp(
    (1 - ALPHA_SYNERGY) * current.synergyGapTolerance + ALPHA_SYNERGY * synergyGap,
    T.params.synergyGapMin,
    T.params.synergyGapMax
  );
  return saveIntegrationParams({ synergyGapTolerance });
}

/** Record actual audit interval for adaptive reminder threshold. */
export async function updateIntegrationParamsFromAuditInterval(daysSinceLast: number): Promise<OperatorIntegrationParams> {
  const current = await getIntegrationParams();
  const auditIntervalDaysEma = clamp(
    (1 - ALPHA_AUDIT) * current.auditIntervalDaysEma + ALPHA_AUDIT * daysSinceLast,
    T.params.auditIntervalMin,
    T.params.auditIntervalMax
  );
  return saveIntegrationParams({ auditIntervalDaysEma });
}
