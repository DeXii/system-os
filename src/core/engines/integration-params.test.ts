import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { getIntegrationParams, updateIntegrationParamsFromDayReport } from './integration-params';

describe('integration-params', () => {
  beforeEach(async () => {
    await db.open();
    await db.operatorIntegrationParams.clear();
  });

  it('updates compliance and debrief EMA from day report', async () => {
    const report = {
      id: 'dr-1',
      date: '2026-05-30',
      protocolPct: 0.8,
      missionPct: 0.7,
      compliance: 75,
      debriefDone: true,
      briefingDone: true,
    };
    const next = await updateIntegrationParamsFromDayReport(report);
    expect(next.complianceTargetEma).toBeGreaterThan(62);
    expect(next.debriefTargetEma).toBeGreaterThan(75);

    const persisted = await getIntegrationParams();
    expect(persisted.complianceTargetEma).toBe(next.complianceTargetEma);
  });
});
