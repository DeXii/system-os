import { TASK_KEYS } from '@/content/task-keys';
import { db, todayKey, tomorrowKey, uid, weekdayIndex, weekdayIndexForDate } from '../db';
import type {
  DayScheduleOverride,
  OperatorProfile,
  ScheduleItemType,
  ScheduleSlot,
  WeekdayIndex,
  WeekScheduleTemplate,
} from '../domain/types';
import { STAGE_ORDER } from '../domain/types';
import { getUnlockedStages } from './mission-accumulation';

const TYPE_ORDER: ScheduleItemType[] = [
  'briefing',
  'protocol',
  'mission',
  'workout',
  'cardio',
  'custom',
  'debrief',
];

function slotRank(type: ScheduleItemType, index: number): number {
  const base = TYPE_ORDER.indexOf(type) * 100;
  return base + index;
}

const dayScheduleChains = new Map<string, Promise<unknown>>();

function runWithDayScheduleLock<T>(date: string, fn: () => Promise<T>): Promise<T> {
  const prev = dayScheduleChains.get(date) ?? Promise.resolve();
  const result = prev.then(() => fn());
  dayScheduleChains.set(
    date,
    result.then(
      () => undefined,
      () => undefined
    )
  );
  return result;
}

export async function getWeekTemplate(): Promise<WeekScheduleTemplate> {
  const existing = await db.weekTemplate.get('week-template');
  if (existing) return existing;
  const template = buildDefaultWeekTemplate();
  await db.weekTemplate.put(template);
  return template;
}

export function buildDefaultWeekTemplate(): WeekScheduleTemplate {
  const empty = (): ScheduleSlot[] => [];
  const slots: Record<WeekdayIndex, ScheduleSlot[]> = {
    0: empty(),
    1: empty(),
    2: empty(),
    3: empty(),
    4: empty(),
    5: empty(),
    6: empty(),
  };
  ([1, 3, 5] as WeekdayIndex[]).forEach((day) => {
    slots[day] = [
      {
        id: uid(),
        taskKey: TASK_KEYS.foundationWorkout,
        type: 'workout',
        title: 'Bar workout (турник/брусья)',
        rank: slotRank('workout', 0),
        priority: 'critical',
        stage: 'foundation',
        status: 'pending',
      },
    ];
  });
  ([2, 4] as WeekdayIndex[]).forEach((day) => {
    slots[day] = [
      {
        id: uid(),
        taskKey: TASK_KEYS.foundationCardio,
        type: 'cardio',
        title: 'Кардио: бег/ходьба 20–30 мин',
        rank: slotRank('cardio', 0),
        priority: 'routine',
        stage: 'foundation',
        status: 'pending',
      },
    ];
  });
  return { id: 'week-template', slots };
}

export async function getSlotsForDate(date: string): Promise<ScheduleSlot[]> {
  const override = await db.dayOverrides.get(date);
  if (override) return [...override.slots].sort((a, b) => a.rank - b.rank);
  const template = await getWeekTemplate();
  const wd = weekdayIndex(new Date(date + 'T12:00:00'));
  return [...(template.slots[wd] ?? [])].sort((a, b) => a.rank - b.rank);
}

async function saveDayOverrideUnlocked(
  date: string,
  slots: ScheduleSlot[],
  source: DayScheduleOverride['source'] = 'manual',
  note?: string
): Promise<void> {
  await db.dayOverrides.put({ date, slots, source, note });
}

export async function saveDayOverride(
  date: string,
  slots: ScheduleSlot[],
  source: DayScheduleOverride['source'] = 'manual',
  note?: string
): Promise<void> {
  return runWithDayScheduleLock(date, () =>
    saveDayOverrideUnlocked(date, slots, source, note)
  );
}

export async function buildTodayQueue(date = todayKey()): Promise<ScheduleSlot[]> {
  const override = await db.dayOverrides.get(date);
  if (!override || override.slots.length === 0) {
    await syncFromMissionsAndProtocol(date);
  } else {
    await mergeSlotStatusesAndMissing(date);
  }
  const slots = await getSlotsForDate(date);
  return slots.filter((s) => s.status !== 'skipped').sort((a, b) => a.rank - b.rank);
}

async function mergeSlotStatusesAndMissingInner(date: string): Promise<void> {
  const existing = await db.dayOverrides.get(date);
  const missions = await db.missions.where('date').equals(date).toArray();
  const protocol = await db.protocolItems.where('date').equals(date).toArray();
  const byKey = new Map<string, ScheduleSlot>();

  for (const s of existing?.slots ?? []) {
    const key = s.taskKey ?? s.id;
    let slot = { ...s };
    if (s.type === 'mission' && s.refId) {
      const m = missions.find((x) => x.id === s.refId);
      if (m?.status === 'done') slot = { ...slot, status: 'done' };
      else if (m?.status === 'skipped') slot = { ...slot, status: 'skipped' };
    }
    if (s.type === 'protocol' && s.refId) {
      const p = protocol.find((x) => x.id === s.refId);
      if (p?.done) slot = { ...slot, status: 'done' };
    }
    byKey.set(key, slot);
  }

  let pIdx = protocol.length;
  for (const p of protocol) {
    const key = p.taskKey ?? `protocol.${p.id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      id: uid(),
      taskKey: key,
      refId: p.id,
      type: 'protocol',
      title: p.label,
      rank: slotRank('protocol', pIdx++),
      priority: p.priority === 'critical' ? 'critical' : 'routine',
      stage: p.stage,
      status: p.done ? 'done' : 'pending',
    });
  }

  let mIdx = missions.length;
  for (const m of missions) {
    const key = m.taskKey ?? `mission.${m.id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      id: uid(),
      taskKey: key,
      refId: m.id,
      type: 'mission',
      title: m.title,
      rank: slotRank('mission', mIdx++),
      priority: m.priority,
      stage: m.stage,
      status: m.status === 'done' ? 'done' : m.status === 'skipped' ? 'skipped' : 'pending',
    });
  }

  const merged = rebuildDayRanks(Array.from(byKey.values()));
  await saveDayOverrideUnlocked(date, merged, existing?.source ?? 'manual');
}

async function mergeSlotStatusesAndMissing(date: string): Promise<void> {
  return runWithDayScheduleLock(date, () => mergeSlotStatusesAndMissingInner(date));
}

async function syncFromMissionsAndProtocolInner(date: string): Promise<ScheduleSlot[]> {
  const missions = await db.missions.where('date').equals(date).toArray();
  const protocol = await db.protocolItems.where('date').equals(date).toArray();
  const templateSlots = await getSlotsForDate(date);
  const byKey = new Map<string, ScheduleSlot>();

  const briefing: ScheduleSlot = {
    id: uid(),
    taskKey: TASK_KEYS.briefing,
    type: 'briefing',
    title: 'Утренний briefing DIRECTOR',
    rank: slotRank('briefing', 0),
    priority: 'critical',
    status: 'pending',
  };
  byKey.set(TASK_KEYS.briefing, briefing);

  let idx = 0;
  for (const p of protocol) {
    const key = p.taskKey ?? `protocol.${p.id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      id: uid(),
      taskKey: key,
      refId: p.id,
      type: 'protocol',
      title: p.label,
      rank: slotRank('protocol', idx++),
      priority: p.priority === 'critical' ? 'critical' : 'routine',
      stage: p.stage,
      status: p.done ? 'done' : 'pending',
    });
  }

  idx = 0;
  for (const m of missions) {
    const key = m.taskKey ?? `mission.${m.id}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      id: uid(),
      taskKey: key,
      refId: m.id,
      type: 'mission',
      title: m.title,
      rank: slotRank('mission', idx++),
      priority: m.priority,
      stage: m.stage,
      status: m.status === 'done' ? 'done' : m.status === 'skipped' ? 'skipped' : 'pending',
    });
  }

  for (const t of templateSlots) {
    const key = t.taskKey ?? t.id;
    if (!byKey.has(key)) byKey.set(key, { ...t, status: t.status ?? 'pending' });
  }

  const profile = await db.operator.toCollection().first();
  if (profile) {
    for (const slot of buildRegulationSlots(profile, date)) {
      const key = slot.taskKey ?? slot.id;
      if (!byKey.has(key)) byKey.set(key, slot);
    }
    for (const slot of buildMindSlots(profile, date)) {
      const key = slot.taskKey ?? slot.id;
      if (!byKey.has(key)) byKey.set(key, slot);
    }
    for (const slot of buildInfluenceSlots(profile, date)) {
      const key = slot.taskKey ?? slot.id;
      if (!byKey.has(key)) byKey.set(key, slot);
    }
    for (const slot of buildIntegrationSlots(profile, date)) {
      const key = slot.taskKey ?? slot.id;
      if (!byKey.has(key)) byKey.set(key, slot);
    }
  }

  const debrief: ScheduleSlot = {
    id: uid(),
    taskKey: TASK_KEYS.debrief,
    type: 'debrief',
    title: 'Вечерний debrief',
    rank: slotRank('debrief', 0),
    priority: 'routine',
    status: 'pending',
  };
  byKey.set(TASK_KEYS.debrief, debrief);

  const slots = rebuildDayRanks(Array.from(byKey.values()));
  await saveDayOverrideUnlocked(date, slots, 'manual');
  return slots;
}

export async function syncFromMissionsAndProtocol(date: string): Promise<ScheduleSlot[]> {
  return runWithDayScheduleLock(date, () => syncFromMissionsAndProtocolInner(date));
}

export function rebuildDayRanks(slots: ScheduleSlot[]): ScheduleSlot[] {
  const order = (s: ScheduleSlot) => {
    const typeIdx = TYPE_ORDER.indexOf(s.type);
    const stageIdx = s.stage ? STAGE_ORDER.indexOf(s.stage) : 99;
    return typeIdx * 1000 + stageIdx * 10 + s.rank;
  };
  return [...slots]
    .sort((a, b) => order(a) - order(b))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export async function moveSlotToDate(
  slotId: string,
  fromDate: string,
  toDate: string
): Promise<void> {
  const fromSlots = await getSlotsForDate(fromDate);
  const slot = fromSlots.find((s) => s.id === slotId);
  if (!slot) return;
  const remaining = fromSlots.filter((s) => s.id !== slotId);
  await saveDayOverride(fromDate, rebuildDayRanks(remaining));

  const toSlots = await getSlotsForDate(toDate);
  const moved = { ...slot, id: uid(), status: 'pending' as const };
  toSlots.push(moved);
  await saveDayOverride(toDate, rebuildDayRanks(toSlots));
}

export async function markSlotSkipped(slotId: string, date: string): Promise<void> {
  const slots = await getSlotsForDate(date);
  const updated = slots.map((s) =>
    s.id === slotId ? { ...s, status: 'skipped' as const } : s
  );
  await saveDayOverride(date, updated);
}

export async function updateSlotStatus(
  slotId: string,
  date: string,
  status: ScheduleSlot['status']
): Promise<void> {
  const slots = await getSlotsForDate(date);
  const updated = slots.map((s) => (s.id === slotId ? { ...s, status } : s));
  await saveDayOverride(date, updated);
}

export async function findSlotByTaskKey(
  taskKey: string,
  date = todayKey()
): Promise<ScheduleSlot | undefined> {
  const slots = await getSlotsForDate(date);
  return slots.find((s) => s.taskKey === taskKey);
}

export function buildRegulationSlots(profile: OperatorProfile, date: string): ScheduleSlot[] {
  const unlocked = getUnlockedStages(profile);
  if (!unlocked.includes('regulation')) return [];

  const wd = weekdayIndexForDate(date);
  const useWimHof = wd === 2 || wd === 5;
  const breathKey = useWimHof
    ? TASK_KEYS.regulationBreathingWimhof
    : TASK_KEYS.regulationBreathingResonant;
  const breathTitle = useWimHof
    ? 'Wim Hof LIVE (осторожно, disclaimer)'
    : 'Резонансное дыхание LIVE';

  return [
    {
      id: uid(),
      taskKey: TASK_KEYS.regulationHrv,
      type: 'protocol',
      title: 'HRV check-in (утро)',
      rank: slotRank('protocol', 0),
      priority: 'critical',
      stage: 'regulation',
      status: 'pending',
    },
    {
      id: uid(),
      taskKey: breathKey,
      type: 'protocol',
      title: breathTitle,
      rank: slotRank('protocol', 1),
      priority: 'routine',
      stage: 'regulation',
      status: 'pending',
    },
    {
      id: uid(),
      taskKey: TASK_KEYS.regulationMindfulness,
      type: 'protocol',
      title: 'Mindfulness / MMFT',
      rank: slotRank('protocol', 2),
      priority: 'routine',
      stage: 'regulation',
      status: 'pending',
    },
  ];
}

export function buildInfluenceSlots(profile: OperatorProfile, _date: string): ScheduleSlot[] {
  const unlocked = getUnlockedStages(profile);
  if (!unlocked.includes('influence')) return [];

  return [
    {
      id: uid(),
      taskKey: TASK_KEYS.influenceMi,
      type: 'protocol',
      title: 'MI — открытые вопросы (OARS)',
      rank: slotRank('protocol', 0),
      priority: 'critical',
      stage: 'influence',
      status: 'pending',
    },
    {
      id: uid(),
      taskKey: TASK_KEYS.influenceNudge,
      type: 'protocol',
      title: 'Nudge — архитектура выбора',
      rank: slotRank('protocol', 1),
      priority: 'routine',
      stage: 'influence',
      status: 'pending',
    },
  ];
}

export function buildIntegrationSlots(
  _profile: OperatorProfile,
  date: string
): ScheduleSlot[] {
  const d = new Date(`${date}T12:00:00`);
  if (weekdayIndex(d) !== 6) return [];
  return [
    {
      id: uid(),
      taskKey: TASK_KEYS.integrationWeeklyAudit,
      type: 'protocol',
      title: 'Weekly System Audit',
      rank: slotRank('protocol', 0),
      priority: 'critical',
      stage: 'foundation',
      status: 'pending',
    },
  ];
}

export function buildMindSlots(profile: OperatorProfile, date: string): ScheduleSlot[] {
  const unlocked = getUnlockedStages(profile);
  if (!unlocked.includes('mind')) return [];

  const wd = weekdayIndexForDate(date);
  const gameLabel = wd % 2 === 0 ? 'Шахматы' : 'Go';

  return [
    {
      id: uid(),
      taskKey: TASK_KEYS.mindChess,
      type: 'protocol',
      title: `Chess/Go: ${gameLabel}`,
      rank: slotRank('protocol', 0),
      priority: 'critical',
      stage: 'mind',
      status: 'pending',
    },
    {
      id: uid(),
      taskKey: TASK_KEYS.mindReflectShort,
      type: 'protocol',
      title: 'Метапознание: короткий PMR/OODA',
      rank: slotRank('protocol', 1),
      priority: 'routine',
      stage: 'mind',
      status: 'pending',
    },
  ];
}

export async function rescheduleToTomorrow(taskKey: string, date = todayKey()): Promise<void> {
  const slot = await findSlotByTaskKey(taskKey, date);
  if (!slot) return;
  await moveSlotToDate(slot.id, date, tomorrowKey());
}
