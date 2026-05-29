import { STAGE_TASK_KEYS } from '@/content/task-keys';
import { db, todayKey, uid } from '../db';
import { buildProtocolSpecs } from './mission-accumulation';
import type { OperatorProfile, ProtocolItem, StageId } from '../domain/types';

/** Full-stack compact: 2 items per PDF stage */
export const PROTOCOL_TEMPLATES: Record<StageId, [string, string]> = {
  foundation: [
    'Bar HIFT (турник/брусья, 45–60 мин)',
    'Recovery ops: сон 7+ ч, гидратация, питание',
  ],
  regulation: [
    'Резонансное дыхание LIVE 10 мин',
    'HRV check-in (утро)',
  ],
  mind: [
    'Шахматы или Go — журнал 30+ мин',
    'Короткий PMR/OODA (вечер)',
  ],
  influence: [
    'Influence Protocol — тактика класса перед контактом',
    'MI (OARS) / Nudge — журнал влияния',
  ],
};

export const PROTOCOL_TASK_KEYS: Record<StageId, [string, string]> = {
  foundation: STAGE_TASK_KEYS.foundation.protocol,
  regulation: STAGE_TASK_KEYS.regulation.protocol,
  mind: STAGE_TASK_KEYS.mind.protocol,
  influence: STAGE_TASK_KEYS.influence.protocol,
};

export async function generateFullStackProtocol(
  profile: OperatorProfile,
  date = todayKey()
): Promise<ProtocolItem[]> {
  return db.transaction('rw', db.protocolItems, async () => {
    const existing = await db.protocolItems.where('date').equals(date).toArray();
    if (existing.length > 0) {
      return mergeExistingProtocol(existing, profile, date);
    }

    const specs = buildProtocolSpecs(profile);
    const items: ProtocolItem[] = specs.map((s) => ({
      ...s,
      id: uid(),
      date,
      done: false,
    }));

    const recheck = await db.protocolItems.where('date').equals(date).count();
    if (recheck > 0) {
      const rows = await db.protocolItems.where('date').equals(date).toArray();
      return mergeExistingProtocol(rows, profile, date);
    }

    await db.protocolItems.bulkAdd(items);
    return items;
  });
}

async function mergeExistingProtocol(
  existing: ProtocolItem[],
  profile: OperatorProfile,
  date: string
): Promise<ProtocolItem[]> {
  const specs = buildProtocolSpecs(profile);
  const byKey = new Map(existing.filter((p) => p.taskKey).map((p) => [p.taskKey!, p]));

  for (const spec of specs) {
    if (!spec.taskKey) continue;
    const prev = byKey.get(spec.taskKey);
    if (prev) {
      await db.protocolItems.update(prev.id, {
        label: spec.label,
        priority: spec.priority,
        frequencyTier: spec.frequencyTier,
        stage: spec.stage,
      });
    } else {
      await db.protocolItems.add({
        ...spec,
        id: uid(),
        date,
        done: false,
      });
    }
  }

  return db.protocolItems.where('date').equals(date).toArray();
}
