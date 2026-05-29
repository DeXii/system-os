import { db, todayKey, uid } from '../db';
import {
  buildMissionSpecs,
  getUnlockedStages,
  mergeTier,
} from './mission-accumulation';
import type { Mission, OperatorProfile } from '../domain/types';
import { STAGE_ORDER } from '../domain/types';

export async function generateFullStackMissions(
  profile: OperatorProfile,
  date = todayKey()
): Promise<Mission[]> {
  return db.transaction('rw', db.missions, async () => {
    const existing = await db.missions.where('date').equals(date).toArray();
    if (existing.length > 0) {
      return mergeExistingMissions(existing, profile, date);
    }

    const specs = buildMissionSpecs(profile);
    const missions: Mission[] = specs.map((s) => ({
      ...s,
      id: uid(),
      date,
      status: 'pending',
    }));

    const recheck = await db.missions.where('date').equals(date).count();
    if (recheck > 0) {
      const rows = await db.missions.where('date').equals(date).toArray();
      return mergeExistingMissions(rows, profile, date);
    }

    await db.missions.bulkAdd(missions);
    return missions;
  });
}

async function mergeExistingMissions(
  existing: Mission[],
  profile: OperatorProfile,
  date: string
): Promise<Mission[]> {
  const specs = buildMissionSpecs(profile);
  const byKey = new Map(existing.filter((m) => m.taskKey).map((m) => [m.taskKey!, m]));

  for (const spec of specs) {
    if (!spec.taskKey) continue;
    const prev = byKey.get(spec.taskKey);
    if (prev) {
      const tier = mergeTier(prev.frequencyTier, spec.frequencyTier);
      await db.missions.update(prev.id, {
        title: spec.title,
        priority: spec.priority,
        frequencyTier: tier,
        stage: spec.stage,
      });
    } else {
      const m: Mission = {
        ...spec,
        id: uid(),
        date,
        status: 'pending',
      };
      await db.missions.add(m);
      byKey.set(spec.taskKey, m);
    }
  }

  return db.missions.where('date').equals(date).toArray();
}

export function unlockedStagesList(profile: OperatorProfile) {
  return getUnlockedStages(profile);
}

export { STAGE_ORDER };
