import { DEFAULT_DOCTRINE_RULES } from '@/content/doctrine-defaults';
import { db } from '../db';
import type { OperatorDoctrine } from '../domain/types';

export async function getOrCreateDoctrine(): Promise<OperatorDoctrine> {
  const existing = await db.operatorDoctrine.get('doctrine');
  if (existing) return existing;

  const row: OperatorDoctrine = {
    id: 'doctrine',
    rules: [...DEFAULT_DOCTRINE_RULES],
    updatedAt: new Date().toISOString(),
  };
  await db.operatorDoctrine.put(row);
  return row;
}

export async function saveDoctrine(rules: string[]): Promise<OperatorDoctrine> {
  const trimmed = rules.map((r) => r.trim()).filter(Boolean).slice(0, 10);
  const row: OperatorDoctrine = {
    id: 'doctrine',
    rules: trimmed,
    updatedAt: new Date().toISOString(),
  };
  await db.operatorDoctrine.put(row);
  return row;
}

export async function isDoctrineEmpty(): Promise<boolean> {
  const d = await db.operatorDoctrine.get('doctrine');
  return !d || d.rules.length === 0;
}
