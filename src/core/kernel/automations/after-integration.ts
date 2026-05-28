import { TASK_KEYS } from '@/content/task-keys';
import { db, todayKey } from '../../db';
import type { AiInsight, PersonalDevelopmentPlan } from '../../domain/types';
import { weekStartKey } from '../../engines/library-books';
import { emitKernel, emitOsRefresh } from '../../events/event-bus';
import { completeByTaskKey, completeIntegrationPractice } from '../commands/complete';

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
