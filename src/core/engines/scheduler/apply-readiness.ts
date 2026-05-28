import { TASK_KEYS } from '@/content/task-keys';
import type { ScheduleSlot } from '../../domain/types';
import type { OperatorMode } from '../operator-mode';

const INTENSIVE_INFLUENCE_KEYS = new Set<string>([
  TASK_KEYS.influenceProtocol,
  'influence.bias',
  TASK_KEYS.influenceObservation,
]);

const HEAVY_MIND_KEYS = new Set<string>([TASK_KEYS.mindScenario]);

export function applyReadinessToSlots(
  slots: ScheduleSlot[],
  mode: OperatorMode
): ScheduleSlot[] {
  if (mode.mode === 'recover') {
    return slots.filter((s) => {
      const key = s.taskKey ?? '';
      if (INTENSIVE_INFLUENCE_KEYS.has(key)) return false;
      if (HEAVY_MIND_KEYS.has(key)) return false;
      return true;
    });
  }
  if (mode.mode === 'observe') {
    return slots.filter((s) => !HEAVY_MIND_KEYS.has(s.taskKey ?? ''));
  }
  if (mode.mode === 'calculate') {
    return slots.filter((s) => !INTENSIVE_INFLUENCE_KEYS.has(s.taskKey ?? ''));
  }
  return slots;
}
