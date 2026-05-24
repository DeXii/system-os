import { TASK_KEYS } from '@/content/task-keys';
import { db, todayKey, uid } from '../db';
import type {
  AiAction,
  AiInsight,
  BreathingSession,
  ChessGoSession,
  DecisionLogEntry,
  InfluenceEntry,
  MindfulnessSession,
  ModuleId,
  OperatorProfile,
  PersonalDevelopmentPlan,
  PstEntry,
  ReflectionEntry,
  ScenarioAnalysis,
  StressLogEntry,
  WorkoutPlan,
} from '../domain/types';
import { weekStartKey } from './library-books';
import { summarizeBreathingSession } from './regulation-metrics';
import { refreshDayReportCompliance } from './command-compliance';
import { generateFullStackMissions } from './mission-generator';
import { generateFullStackProtocol } from './protocol-generator';
import { onStageAdvance, onStageDemotion } from './mission-accumulation';
import {
  buildTodayQueue,
  findSlotByTaskKey,
  moveSlotToDate,
  syncFromMissionsAndProtocol,
  updateSlotStatus,
} from './week-schedule';
import { applyWorkoutPlanFromDirector } from './workout-planner';
import { emitKernel, emitOsRefresh } from '../events/event-bus';

export async function ensureDayBootstrapped(profile: OperatorProfile, date = todayKey()) {
  await generateFullStackProtocol(profile, date);
  await generateFullStackMissions(profile, date);
  await ensureWeeklyReadingMission(profile, date);
  await syncFromMissionsAndProtocol(date);
}

export async function ensureWeeklyReadingMission(
  profile: OperatorProfile,
  date = todayKey()
): Promise<void> {
  const since = weekStartKey(new Date(date + 'T12:00:00'));
  const existing = await db.missions
    .where('date')
    .aboveOrEqual(since)
    .filter((m) => m.taskKey === TASK_KEYS.readingWeekly)
    .first();
  if (existing) return;
  await db.missions.add({
    id: uid(),
    date,
    title: 'Чтение: 1 книга / N глав на неделю',
    stage: profile.currentStage,
    priority: 'routine',
    status: 'pending',
    source: 'protocol',
    taskKey: TASK_KEYS.readingWeekly,
    frequencyTier: 'maintenance',
  });
}

export async function completeScheduleSlot(
  slotId: string,
  date: string,
  module: ModuleId = 'command'
): Promise<void> {
  const { getSlotsForDate } = await import('./week-schedule');
  const slots = await getSlotsForDate(date);
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return;

  await updateSlotStatus(slotId, date, 'done');

  if (slot.type === 'mission' && slot.refId) {
    await db.missions.update(slot.refId, { status: 'done' });
  }
  if (slot.type === 'protocol' && slot.refId) {
    await db.protocolItems.update(slot.refId, { done: true });
  }

  await refreshDayReportCompliance(date);
  await emitKernel(module, `Выполнено: ${slot.title}`, 'success', slot.taskKey);
  emitOsRefresh();
}

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
    await emitKernel(module, `Протокол: ${protocol.label}`, 'success', taskKey);
    emitOsRefresh();
  }
}

export async function syncDayFromGenerators(
  profile: OperatorProfile,
  date = todayKey()
): Promise<void> {
  await ensureDayBootstrapped(profile, date);
  emitOsRefresh();
}

export async function applyDirectorActions(actions: AiAction[]): Promise<void> {
  const profile = await db.operator.toCollection().first();
  const today = todayKey();

  for (const action of actions) {
    if (action.type === 'move_slot') {
      const taskKey = String(action.payload.taskKey ?? '');
      const toDate = String(action.payload.toDate ?? tomorrowFrom(action));
      const slot = await findSlotByTaskKey(taskKey, today);
      if (slot) await moveSlotToDate(slot.id, today, toDate);
      await emitKernel('director', `Перенос: ${taskKey} → ${toDate}`, 'info', taskKey);
    }
    if (action.type === 'complete_slot') {
      const taskKey = String(action.payload.taskKey ?? '');
      await completeByTaskKey(taskKey, today, 'director');
    }
    if (action.type === 'add_schedule_slot' && action.payload.title) {
      const slots = await buildTodayQueue(today);
      slots.push({
        id: uid(),
        taskKey: String(action.payload.taskKey ?? `custom.${uid()}`),
        type: 'custom',
        title: String(action.payload.title),
        rank: slots.length + 1,
        priority: 'routine',
        status: 'pending',
        stage: profile?.currentStage,
      });
      const { saveDayOverride, rebuildDayRanks } = await import('./week-schedule');
      await saveDayOverride(today, rebuildDayRanks(slots), 'director');
    }
    if (action.type === 'add_mission' && action.payload.title) {
      await db.missions.add({
        id: uid(),
        date: today,
        title: String(action.payload.title),
        stage: profile?.currentStage ?? 'foundation',
        priority: 'routine',
        status: 'pending',
        source: 'director',
        taskKey: String(action.payload.taskKey ?? `director.${uid()}`),
      });
      if (profile) await syncFromMissionsAndProtocol(today);
    }
    if (action.type === 'add_protocol' && action.payload.label) {
      await db.protocolItems.add({
        id: uid(),
        date: today,
        label: String(action.payload.label),
        done: false,
        stage: profile?.currentStage ?? 'foundation',
        priority: 'routine',
        phase: 'any',
        taskKey: String(action.payload.taskKey ?? `director.${uid()}`),
      });
      if (profile) await syncFromMissionsAndProtocol(today);
    }
    if (action.type === 'set_workout_plan' && Array.isArray(action.payload.exercises)) {
      await applyWorkoutPlanFromDirector(action.payload.exercises as unknown[], today);
      await emitKernel(
        'foundation',
        'План тренировки от DIRECTOR применён',
        'success',
        TASK_KEYS.foundationWorkout
      );
    }
    if (action.type === 'log_note') {
      const noteText = String(action.payload.text ?? action.payload.note ?? '').trim();
      if (noteText) {
        const existing = await db.dailyLogs.where('date').equals(today).first();
        if (existing) {
          const merged = existing.notes ? `${existing.notes}\n${noteText}` : noteText;
          await db.dailyLogs.update(existing.id, { notes: merged });
        } else {
          await db.dailyLogs.add({
            id: uid(),
            date: today,
            notes: noteText,
          });
        }
        await emitKernel('director', `Заметка: ${noteText.slice(0, 60)}`, 'info');
      }
    }
  }
  emitOsRefresh();
}

function tomorrowFrom(action: AiAction): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (action.payload.toDate) return String(action.payload.toDate);
  return d.toISOString().split('T')[0];
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

export async function afterBreathingComplete(
  session: Omit<BreathingSession, 'id'>
): Promise<BreathingSession> {
  const entry: BreathingSession = { ...session, id: uid() };
  await db.breathingSessions.add(entry);
  const taskKey =
    session.mode === 'wim_hof'
      ? TASK_KEYS.regulationBreathingWimhof
      : TASK_KEYS.regulationBreathingResonant;
  await completeRegulationPractice(
    taskKey,
    `Дыхание: ${summarizeBreathingSession(entry)}`,
    session.date
  );
  return entry;
}

export async function afterMindfulnessComplete(
  session: Omit<MindfulnessSession, 'id'>
): Promise<MindfulnessSession> {
  const entry: MindfulnessSession = { ...session, id: uid() };
  await db.mindfulnessSessions.add(entry);
  await completeRegulationPractice(
    TASK_KEYS.regulationMindfulness,
    `Mindfulness ${session.durationMin} мин (${session.type})`,
    session.date
  );
  return entry;
}

export async function afterStressLogComplete(
  entry: Omit<StressLogEntry, 'id'>,
  options?: { pstEntry?: Omit<PstEntry, 'id'> }
): Promise<StressLogEntry> {
  const log: StressLogEntry = { ...entry, id: uid() };
  await db.stressLogs.add(log);
  await completeRegulationPractice(
    TASK_KEYS.regulationStress,
    `Stress log: ${entry.trigger.slice(0, 40)}`,
    entry.date
  );
  if (options?.pstEntry) {
    const pst: PstEntry = { ...options.pstEntry, id: uid() };
    await db.pstEntries.add(pst);
    await completeRegulationPractice(
      TASK_KEYS.regulationPst,
      'PST запись сохранена',
      entry.date
    );
  }
  return log;
}

export async function afterHrvComplete(
  entry: Omit<import('../domain/types').HrvEntry, 'id'>
): Promise<void> {
  await db.hrvEntries.add({ ...entry, id: uid() });
  await completeRegulationPractice(
    TASK_KEYS.regulationHrv,
    'HRV записан',
    entry.date
  );
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

export async function afterChessGoComplete(
  session: Omit<ChessGoSession, 'id'>
): Promise<ChessGoSession> {
  const entry: ChessGoSession = {
    ...session,
    id: uid(),
    ratingAfter: session.ratingAfter ?? session.rating,
  };
  await db.chessGoSessions.add(entry);
  await completeMindPractice(
    TASK_KEYS.mindChess,
    `${entry.game === 'chess' ? 'Шахматы' : 'Go'} ${entry.durationMin} мин`,
    entry.date
  );
  return entry;
}

export async function afterReflectionComplete(
  entry: Omit<ReflectionEntry, 'id'>
): Promise<ReflectionEntry> {
  const row: ReflectionEntry = { ...entry, id: uid() };
  await db.reflections.add(row);
  const taskKey =
    row.mode === 'pmr_extended'
      ? TASK_KEYS.mindReflectExtended
      : TASK_KEYS.mindReflectShort;
  await completeMindPractice(
    taskKey,
    `Метапознание (${row.mode ?? 'pmr'})`,
    row.date
  );
  await completeByTaskKey(TASK_KEYS.mindReflect, row.date, 'mind');
  return row;
}

export async function afterScenarioComplete(
  scenario: Omit<ScenarioAnalysis, 'id'>,
  options?: { decisionLog?: Omit<DecisionLogEntry, 'id'> }
): Promise<ScenarioAnalysis> {
  const row: ScenarioAnalysis = { ...scenario, id: uid() };
  await db.scenarios.add(row);
  if (options?.decisionLog) {
    const log = await afterDecisionLogComplete({
      ...options.decisionLog,
      linkedScenarioId: row.id,
    });
    await db.scenarios.update(row.id, { linkedDecisionId: log.id });
  }
  await completeMindPractice(
    TASK_KEYS.mindScenario,
    `Сценарий: ${row.title.slice(0, 40)}`,
    row.date
  );
  return row;
}

export async function afterDecisionLogComplete(
  entry: Omit<DecisionLogEntry, 'id'>
): Promise<DecisionLogEntry> {
  const row: DecisionLogEntry = { ...entry, id: uid() };
  await db.decisionLogs.add(row);
  await completeMindPractice(
    TASK_KEYS.mindDecisionLog,
    `Решение: ${row.title.slice(0, 40)}`,
    row.date
  );
  return row;
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

export async function afterMiEntryComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  const row: InfluenceEntry = { ...entry, id: uid(), type: 'mi' };
  await db.influenceEntries.add(row);
  await completeInfluencePractice(
    TASK_KEYS.influenceMi,
    `MI (OARS): ${(row.situation ?? row.context ?? '').slice(0, 40)}`,
    row.date
  );
  return row;
}

export async function afterNudgeEntryComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  const row: InfluenceEntry = { ...entry, id: uid(), type: 'nudge' };
  await db.influenceEntries.add(row);
  await completeInfluencePractice(
    TASK_KEYS.influenceNudge,
    `Nudge (${row.nudgeType ?? 'default'}): ${(row.context ?? '').slice(0, 40)}`,
    row.date
  );
  return row;
}

export async function afterBiasEntryComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  const row: InfluenceEntry = { ...entry, id: uid(), type: 'bias' };
  await db.influenceEntries.add(row);
  await completeInfluencePractice(
    'influence.bias',
    `Bias: ${row.biasName ?? 'искажение'}`,
    row.date
  );
  return row;
}

export async function afterProtocolComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  const row: InfluenceEntry = { ...entry, id: uid(), type: 'protocol' };
  await db.influenceEntries.add(row);
  await completeInfluencePractice(
    TASK_KEYS.influenceProtocol,
    'Influence Protocol — тактика класса',
    row.date
  );
  return row;
}

export async function afterObservationComplete(
  entry: Omit<InfluenceEntry, 'id'>
): Promise<InfluenceEntry> {
  const row: InfluenceEntry = {
    ...entry,
    id: uid(),
    type: entry.type === 'debrief' ? 'debrief' : 'observation',
  };
  await db.influenceEntries.add(row);
  await completeInfluencePractice(
    TASK_KEYS.influenceObservation,
    `${row.type === 'debrief' ? 'Debrief' : 'Наблюдение'}: ${(row.context ?? row.situation ?? '').slice(0, 40)}`,
    row.date
  );
  return row;
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

export async function afterPdpSave(pdp: PersonalDevelopmentPlan): Promise<PersonalDevelopmentPlan> {
  const row: PersonalDevelopmentPlan = {
    ...pdp,
    updatedAt: new Date().toISOString(),
  };
  await db.pdp.put(row);
  const operator = await db.operator.toCollection().first();
  if (operator) {
    const goalLines = row.northStar?.trim()
      ? [`[North Star] ${row.northStar.trim()}`, ...row.goals]
      : [...row.goals];
    await db.operator.update(operator.id, { goals: goalLines.join('\n') });
  }
  await emitKernel('integration', 'PDP обновлён', 'success', TASK_KEYS.integrationPdpReview);
  emitOsRefresh();
  return row;
}

export async function afterWeeklyAuditComplete(_insight: AiInsight): Promise<void> {
  await completeIntegrationPractice(
    TASK_KEYS.integrationWeeklyAudit,
    'Weekly System Audit завершён',
    todayKey()
  );
}

export async function afterBookMarkedRead(
  bookId: string,
  chaptersRead?: string
): Promise<void> {
  const today = todayKey();
  await db.libraryBooks.update(bookId, {
    status: 'read',
    readAt: today,
    chaptersRead,
  });
  const weekly = await db.missions
    .where('date')
    .aboveOrEqual(weekStartKey())
    .filter((m) => m.taskKey === TASK_KEYS.readingWeekly && m.status === 'pending')
    .first();
  if (weekly) {
    await completeByTaskKey(TASK_KEYS.readingWeekly, today, 'library');
  }
  const book = await db.libraryBooks.get(bookId);
  await emitKernel(
    'library',
    `Прочитано: ${book?.title ?? bookId}${chaptersRead ? ` (${chaptersRead})` : ''}`,
    'success',
    TASK_KEYS.readingWeekly
  );
  emitOsRefresh();
}

export async function afterWorkoutComplete(plan: WorkoutPlan): Promise<void> {
  const today = plan.date;
  await db.workoutPlans.update(plan.id, { status: 'completed' });
  await db.trainingSessions.add({
    id: uid(),
    date: today,
    type: 'strength',
    durationMin: plan.exercises.reduce((a, e) => a + e.sets * 2, 15),
    intensity: 'medium',
    notes: 'Bar workout LIVE',
  });
  await completeByTaskKey(TASK_KEYS.foundationWorkout, today, 'foundation');
  await refreshDayReportCompliance(today);
  await emitKernel('foundation', 'Тренировка завершена (LIVE)', 'success', TASK_KEYS.foundationWorkout);
  emitOsRefresh();
}

export async function confirmStageAdvanceKernel(
  profile: OperatorProfile,
  accept: boolean,
  pending: import('../domain/types').StageId | undefined
): Promise<OperatorProfile> {
  if (!accept || !pending) return profile;
  const updated = await onStageAdvance(profile, pending);
  await db.operator.put(updated);
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
  target: import('../domain/types').StageId | undefined
): Promise<OperatorProfile> {
  if (!accept || !target) return profile;
  const updated = await onStageDemotion(profile, target);
  await db.operator.put(updated);
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
