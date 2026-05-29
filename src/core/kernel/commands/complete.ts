import { TASK_KEYS } from '@/content/task-keys';
import { db, todayKey } from '../../db';
import type { ModuleId } from '../../domain/types';
import { refreshDayReportCompliance } from '../../engines/command-compliance';
import {
  findSlotByTaskKey,
  getSlotsForDate,
  updateSlotStatus,
} from '../../engines/week-schedule';
import { emitKernel, emitOsRefresh } from '../../events/event-bus';
import { afterFactWrite } from '../pipeline';

const BREATHING_ALIASES: Record<string, string[]> = {
  [TASK_KEYS.regulationBreathingResonant]: [
    TASK_KEYS.regulationBreathingResonant,
    TASK_KEYS.regulationBreathing,
  ],
  [TASK_KEYS.regulationBreathingWimhof]: [
    TASK_KEYS.regulationBreathingWimhof,
    TASK_KEYS.regulationBreathing,
  ],
  [TASK_KEYS.regulationBreathing]: [TASK_KEYS.regulationBreathing],
};

export async function completeScheduleSlot(
  slotId: string,
  date: string,
  module: ModuleId = 'command'
): Promise<void> {
  const slots = await getSlotsForDate(date);
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return;

  await updateSlotStatus(slotId, date, 'done');

  if (slot.type === 'mission' && slot.refId) {
    await db.missions.update(slot.refId, { status: 'done' });
    await afterFactWrite({
      type: 'MISSION_COMPLETED',
      date,
      taskKey: slot.taskKey ?? '',
      missionId: slot.refId,
      module,
    });
  }
  if (slot.type === 'protocol' && slot.refId) {
    await db.protocolItems.update(slot.refId, { done: true });
    await afterFactWrite({
      type: 'PROTOCOL_COMPLETED',
      date,
      taskKey: slot.taskKey ?? '',
      protocolId: slot.refId,
      module,
    });
  }

  await refreshDayReportCompliance(date);
  await emitKernel(module, `Выполнено: ${slot.title}`, 'success', slot.taskKey);
  emitOsRefresh();
}

export async function completeByTaskKey(
  taskKey: string,
  date = todayKey(),
  module: ModuleId = 'command'
): Promise<void> {
  const aliases = BREATHING_ALIASES[taskKey] ?? [taskKey];
  for (const key of aliases) {
    const slot = await findSlotByTaskKey(key, date);
    if (slot) {
      await completeScheduleSlot(slot.id, date, module);
      return;
    }
  }

  const mission = await db.missions
    .where('date')
    .equals(date)
    .filter((m) => aliases.includes(m.taskKey ?? ''))
    .first();
  if (mission) {
    await db.missions.update(mission.id, { status: 'done' });
    await refreshDayReportCompliance(date);
    await afterFactWrite({
      type: 'MISSION_COMPLETED',
      date,
      taskKey,
      missionId: mission.id,
      module,
    });
    await emitKernel(module, `Миссия: ${mission.title}`, 'success', taskKey);
    emitOsRefresh();
    return;
  }

  const protocol = await db.protocolItems
    .where('date')
    .equals(date)
    .filter((p) => aliases.includes(p.taskKey ?? ''))
    .first();
  if (protocol) {
    await db.protocolItems.update(protocol.id, { done: true });
    await refreshDayReportCompliance(date);
    await afterFactWrite({
      type: 'PROTOCOL_COMPLETED',
      date,
      taskKey,
      protocolId: protocol.id,
      module,
    });
    await emitKernel(module, `Протокол: ${protocol.label}`, 'success', taskKey);
    emitOsRefresh();
  }
}

export async function completeRegulationPractice(
  taskKey: string,
  message: string,
  date = todayKey()
): Promise<void> {
  await completeByTaskKey(taskKey, date, 'regulation');
  await refreshDayReportCompliance(date);
  await emitKernel('regulation', message, 'success', taskKey);
  emitOsRefresh();
}

export async function completeMindPractice(
  taskKey: string,
  message: string,
  date = todayKey()
): Promise<void> {
  await completeByTaskKey(taskKey, date, 'mind');
  await refreshDayReportCompliance(date);
  await emitKernel('mind', message, 'success', taskKey);
  emitOsRefresh();
}

export async function completeInfluencePractice(
  taskKey: string,
  message: string,
  date = todayKey()
): Promise<void> {
  await completeByTaskKey(taskKey, date, 'influence');
  await refreshDayReportCompliance(date);
  await emitKernel('influence', message, 'success', taskKey);
  emitOsRefresh();
}

export async function completeIntegrationPractice(
  taskKey: string,
  message: string,
  date = todayKey()
): Promise<void> {
  await completeByTaskKey(taskKey, date, 'integration');
  await refreshDayReportCompliance(date);
  await emitKernel('integration', message, 'success', taskKey);
  emitOsRefresh();
}
