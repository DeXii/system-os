import { db, todayKey } from '../../db';
import type { OperatorProfile, StageId } from '../../domain/types';
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
  await db.operator.put(updated);
  await emitDomainEvent({ type: 'STAGE_ADVANCED', from, to: pending });
  await emitKernel('command', `Этап: ${pending}. Старые задачи → maintenance`, 'success');
  const today = todayKey();
  await db.missions.where('date').equals(today).delete();
  await db.protocolItems.where('date').equals(today).delete();
  await ensureDayBootstrapped(updated, today);
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
  await db.operator.put(updated);
  await emitDomainEvent({ type: 'STAGE_DEMOTED', from, to: target });
  await emitKernel(
    'integration',
    `Откат на этап: ${target}. Unlocked этапы сохранены.`,
    'warn'
  );
  const today = todayKey();
  await db.missions.where('date').equals(today).delete();
  await db.protocolItems.where('date').equals(today).delete();
  await ensureDayBootstrapped(updated, today);
  emitOsRefresh();
  return updated;
}
