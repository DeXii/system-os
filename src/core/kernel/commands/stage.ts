import { db, todayKey } from '../../db';
import type { OperatorProfile, StageId } from '../../domain/types';
import { refreshDayReportCompliance } from '../../engines/command-compliance';
import { onStageAdvance, onStageDemotion } from '../../engines/mission-accumulation';
import { emitDomainEvent, emitKernel, emitOsRefresh } from '../../events/event-bus';
import { ensureDayBootstrapped } from './bootstrap';

export async function confirmStageAdvanceKernel(
  profile: OperatorProfile,
  accept: boolean,
  pending: StageId | undefined
): Promise<OperatorProfile> {
  if (!accept || !pending) return profile;
  const from = profile.currentStage;
  const updated = await onStageAdvance(profile, pending);
  await emitDomainEvent({ type: 'STAGE_ADVANCED', from, to: pending });
  await emitKernel('command', `Этап: ${pending}. Старые задачи → maintenance`, 'success');
  const today = todayKey();
  await db.transaction('rw', [db.operator, db.missions, db.protocolItems, db.dayOverrides], async () => {
    await db.operator.put(updated);
    await db.missions.where('date').equals(today).delete();
    await db.protocolItems.where('date').equals(today).delete();
    await db.dayOverrides.delete(today);
  });
  await ensureDayBootstrapped(updated, today);
  await refreshDayReportCompliance(today);
  emitOsRefresh();
  return updated;
}

export async function confirmStageDemotionKernel(
  profile: OperatorProfile,
  accept: boolean,
  target: StageId | undefined
): Promise<OperatorProfile> {
  if (!accept || !target) return profile;
  const from = profile.currentStage;
  const updated = await onStageDemotion(profile, target);
  await emitDomainEvent({ type: 'STAGE_DEMOTED', from, to: target });
  await emitKernel(
    'integration',
    `Откат на этап: ${target}. Unlocked этапы сохранены.`,
    'warn'
  );
  const today = todayKey();
  await db.transaction('rw', [db.operator, db.missions, db.protocolItems, db.dayOverrides], async () => {
    await db.operator.put(updated);
    await db.missions.where('date').equals(today).delete();
    await db.protocolItems.where('date').equals(today).delete();
    await db.dayOverrides.delete(today);
  });
  await ensureDayBootstrapped(updated, today);
  await refreshDayReportCompliance(today);
  emitOsRefresh();
  return updated;
}
