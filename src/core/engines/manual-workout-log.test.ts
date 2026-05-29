import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { TASK_KEYS } from '@/content/task-keys';
import { db } from '@/core/db';
import {
  buildManualWorkoutPreview,
  logManualWorkout,
  setLogsFromManualRows,
  validateManualWorkoutInput,
} from './manual-workout-log';

vi.mock('@/core/kernel/automations/after-foundation', () => ({
  afterWorkoutComplete: vi.fn().mockResolvedValue(undefined),
}));

import { afterWorkoutComplete } from '@/core/kernel/automations/after-foundation';

describe('manual-workout-log', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    vi.mocked(afterWorkoutComplete).mockClear();
    await db.workoutPlans.clear();
    await db.setLogs.clear();
    await db.trainingSessions.clear();
    await db.workoutTypeStats.clear();
  });

  it('buildManualWorkoutPreview creates HIFT rows per round × exercise', () => {
    const preview = buildManualWorkoutPreview('hift');
    expect(preview.kind).toBe('hift');
    expect(preview.rounds).toBe(3);
    expect(preview.rows.length).toBe(preview.exercises.length * 3);
    expect(preview.rows[0].roundIndex).toBe(0);
  });

  it('buildManualWorkoutPreview creates GPP rows per set', () => {
    const preview = buildManualWorkoutPreview('push');
    expect(preview.kind).toBe('gpp_push');
    const totalSets = preview.exercises.reduce((a, e) => a + e.sets, 0);
    expect(preview.rows.length).toBe(totalSets);
    expect(preview.rows.every((r) => r.roundIndex == null)).toBe(true);
  });

  it('validateManualWorkoutInput rejects empty actuals', () => {
    const preview = buildManualWorkoutPreview('hift');
    const err = validateManualWorkoutInput({
      date: '2099-01-01',
      type: 'hift',
      durationMin: 30,
      rows: preview.rows,
    });
    expect(err).toContain('будущем');
  });

  it('logManualWorkout persists plan, setLogs and calls afterWorkoutComplete', async () => {
    const preview = buildManualWorkoutPreview('push');
    const rows = preview.rows.map((r, i) =>
      i === 0 ? { ...r, actual: String(r.targetReps) } : r
    );
    const plan = await logManualWorkout({
      date: '2026-05-20',
      type: 'push',
      durationMin: 50,
      notes: 'зал',
      rows,
    });

    expect(plan.status).toBe('completed');
    expect(plan.notes).toBe('manual: зал');
    expect(plan.kind).toBe('gpp_push');

    const stored = await db.workoutPlans.get(plan.id);
    expect(stored?.status).toBe('completed');

    const logs = await db.setLogs.where('workoutPlanId').equals(plan.id).toArray();
    expect(logs.length).toBe(1);
    expect(logs[0].workoutKind).toBe('gpp_push');

    expect(afterWorkoutComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: plan.id, kind: 'gpp_push' }),
      { durationMin: 50, source: 'manual' }
    );
  });

  it('setLogsFromManualRows skips zero actuals', () => {
    const preview = buildManualWorkoutPreview('hift');
    const rows = preview.rows.map((r, i) =>
      i < 2 ? { ...r, actual: '5' } : { ...r, actual: '' }
    );
    const logs = setLogsFromManualRows('p1', '2026-05-20', 'hift', rows);
    expect(logs).toHaveLength(2);
    expect(logs[0].roundIndex).toBeDefined();
  });
});

describe('after-foundation task keys (integration)', () => {
  beforeAll(async () => {
    await db.open();
  });

  afterAll(async () => {
    await db.close();
  });

  it('exports TASK_KEYS used by foundation automations', () => {
    expect(TASK_KEYS.foundationGpp).toBe('foundation.gpp');
    expect(TASK_KEYS.foundationCardio).toBe('foundation.cardio');
    expect(TASK_KEYS.foundationBft).toBe('foundation.bft');
  });
});
