import type { OperatorProfile, ScheduleSlot } from '../../domain/types';
import { computeOperatorMode } from '../operator-mode';
import { applyReadinessToSlots } from './apply-readiness';
import { dedupeSlotsByTaskKey } from './resolve-conflicts';
import { saveDayOverride, syncFromMissionsAndProtocol } from './sync-sources';

export async function buildDay(
  _profile: OperatorProfile,
  date: string
): Promise<ScheduleSlot[]> {
  let slots = await syncFromMissionsAndProtocol(date);
  slots = dedupeSlotsByTaskKey(slots);
  const mode = await computeOperatorMode();
  slots = applyReadinessToSlots(slots, mode);
  await saveDayOverride(date, slots, 'system');
  return slots;
}
