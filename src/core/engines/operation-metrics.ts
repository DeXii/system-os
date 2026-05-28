import { db, todayKey } from '../db';
import type { Operation } from '../domain/types';

export async function getActiveOperations(): Promise<Operation[]> {
  const ops = await db.operations.toArray();
  return ops
    .filter((o) => o.phase !== 'closed' && o.status !== 'lost')
    .sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export async function getOverdueOperations(): Promise<Operation[]> {
  const today = todayKey();
  const active = await getActiveOperations();
  return active.filter((o) => o.deadline && o.deadline < today);
}

export async function getOperationsSummary(): Promise<{
  active: number;
  overdue: number;
  planning: number;
}> {
  const active = await getActiveOperations();
  const overdue = await getOverdueOperations();
  return {
    active: active.length,
    overdue: overdue.length,
    planning: active.filter((o) => o.phase === 'planning').length,
  };
}
