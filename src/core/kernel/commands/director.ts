import { TASK_KEYS } from '@/content/task-keys';
import { db, tomorrowKey, todayKey, uid } from '../../db';
import type { AiAction } from '../../domain/types';
import { applyWorkoutPlanFromDirector } from '../../engines/workout-planner';
import {
  buildTodayQueue,
  findSlotByTaskKey,
  moveSlotToDate,
  rebuildDayRanks,
  saveDayOverride,
  syncFromMissionsAndProtocol,
} from '../../engines/week-schedule';
import { emitDomainEvent, emitKernel, emitOsRefresh } from '../../events/event-bus';
import { completeByTaskKey } from './complete';

function tomorrowFrom(action: AiAction): string {
  if (action.payload.toDate) return String(action.payload.toDate);
  return tomorrowKey();
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
      await applyWorkoutPlanFromDirector(action.payload.exercises as unknown[], today, {
        kind: action.payload.kind as import('../../domain/types').WorkoutKind | undefined,
        structure: action.payload.structure as import('../../domain/types').WorkoutPlan['structure'],
        rounds: Number(action.payload.rounds) || undefined,
        roundRestSec: Number(action.payload.roundRestSec) || undefined,
        circuitExerciseIds: action.payload.circuitExerciseIds as string[] | undefined,
        gppSubtype: action.payload.gppSubtype as import('../../domain/types').GppSubtype | undefined,
        notes: String(action.payload.notes ?? 'План от DIRECTOR'),
      });
      await emitKernel(
        'foundation',
        'План тренировки от DIRECTOR применён',
        'success',
        TASK_KEYS.foundationWorkout
      );
    }
    if (action.type === 'set_cardio_session_plan') {
      const kind = action.payload.kind === 'cardio_easy' ? 'cardio_easy' : 'cardio_intense';
      const durationMin = Math.max(10, Number(action.payload.durationMin) || 25);
      await db.cardioSessions.add({
        id: uid(),
        date: today,
        kind,
        durationMin,
        notes: String(action.payload.suggestedActivity ?? action.payload.notes ?? 'План DIRECTOR'),
      });
      await emitKernel('foundation', `Кардио план: ${durationMin} мин`, 'success');
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

  if (actions.length > 0) {
    await emitDomainEvent({ type: 'DIRECTOR_ACTION_APPLIED', actionCount: actions.length });
  }
  emitOsRefresh();
}
