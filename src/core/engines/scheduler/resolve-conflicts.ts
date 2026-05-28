import type { ScheduleSlot } from '../../domain/types';

/** Deduplicate slots by taskKey; keep lowest rank. */
export function dedupeSlotsByTaskKey(slots: ScheduleSlot[]): ScheduleSlot[] {
  const byKey = new Map<string, ScheduleSlot>();
  for (const slot of slots.sort((a, b) => a.rank - b.rank)) {
    const key = slot.taskKey ?? slot.id;
    if (!byKey.has(key)) {
      byKey.set(key, slot);
    }
  }
  return [...byKey.values()].sort((a, b) => a.rank - b.rank);
}
