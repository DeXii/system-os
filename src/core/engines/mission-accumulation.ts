import { STAGE_TASK_KEYS } from '@/content/task-keys';
import { PROTOCOL_TEMPLATES } from './protocol-generator';
import type {
  FrequencyTier,
  Mission,
  OperatorProfile,
  ProtocolItem,
  StageId,
} from '../domain/types';
import { STAGE_ORDER } from '../domain/types';

const TIER_RANK: Record<FrequencyTier, number> = {
  maintenance: 1,
  daily: 2,
  intensive: 3,
};

const EXTRA_TITLES: Record<StageId, [string, string]> = {
  foundation: [
    'Bar Fitness Test / baseline',
    'Осознанная стресс-тренировка (безопасно)',
  ],
  regulation: ['Mindfulness / MMFT 10 мин', 'PST: внутренняя речь / arousal control'],
  mind: ['Один SWOT или сценарный анализ', 'Дневник решения: почему я так решил?'],
  influence: ['Практика открытых вопросов (MI)', 'Разбор когнитивного искажения в ситуации'],
};

const EXTRA_KEYS: Record<StageId, [string, string]> = {
  foundation: [STAGE_TASK_KEYS.foundation.extras[0], STAGE_TASK_KEYS.foundation.extras[1]],
  regulation: [STAGE_TASK_KEYS.regulation.extras[0], STAGE_TASK_KEYS.regulation.extras[1]],
  mind: [STAGE_TASK_KEYS.mind.extras[0], STAGE_TASK_KEYS.mind.extras[1]],
  influence: [STAGE_TASK_KEYS.influence.extras[0], STAGE_TASK_KEYS.influence.extras[1]],
};

const ANCHOR_TITLES: Record<StageId, string> = {
  foundation: PROTOCOL_TEMPLATES.foundation[0],
  regulation: PROTOCOL_TEMPLATES.regulation[0],
  mind: PROTOCOL_TEMPLATES.mind[0],
  influence: PROTOCOL_TEMPLATES.influence[0],
};

export function getUnlockedStages(profile: OperatorProfile): StageId[] {
  return profile.unlockedStages?.length
    ? profile.unlockedStages
    : [profile.currentStage];
}

export function tierForStage(stage: StageId, current: StageId): FrequencyTier {
  if (stage === current) return 'intensive';
  return 'maintenance';
}

export function mergeTier(
  existing?: FrequencyTier,
  incoming?: FrequencyTier
): FrequencyTier {
  if (!existing) return incoming ?? 'daily';
  if (!incoming) return existing;
  return TIER_RANK[incoming] >= TIER_RANK[existing] ? incoming : existing;
}

export function buildMissionSpecs(profile: OperatorProfile): Omit<Mission, 'id' | 'date' | 'status'>[] {
  const unlocked = getUnlockedStages(profile);
  const current = profile.currentStage;
  const specs: Omit<Mission, 'id' | 'date' | 'status'>[] = [];
  const seen = new Set<string>();

  for (const stage of STAGE_ORDER) {
    if (!unlocked.includes(stage)) continue;
    const tier = tierForStage(stage, current);
    const taskKey = STAGE_TASK_KEYS[stage].anchor;
    if (!seen.has(taskKey)) {
      seen.add(taskKey);
      specs.push({
        title: ANCHOR_TITLES[stage],
        stage,
        priority: tier === 'intensive' ? 'critical' : 'routine',
        source: 'protocol',
        taskKey,
        frequencyTier: tier,
      });
    }
    if (tier === 'intensive') {
      const keys = EXTRA_KEYS[stage];
      const titles = EXTRA_TITLES[stage];
      keys.forEach((key, i) => {
        if (!seen.has(key)) {
          seen.add(key);
          specs.push({
            title: titles[i],
            stage,
            priority: 'critical',
            source: 'protocol',
            taskKey: key,
            frequencyTier: 'intensive',
          });
        }
      });
    } else if (tier === 'maintenance') {
      const key = EXTRA_KEYS[stage][0];
      if (!seen.has(key)) {
        seen.add(key);
        specs.push({
          title: EXTRA_TITLES[stage][0],
          stage,
          priority: 'routine',
          source: 'protocol',
          taskKey: key,
          frequencyTier: 'maintenance',
        });
      }
    }
  }

  specs.push({
    title: 'Вечерний debrief в COMMAND',
    stage: current,
    priority: 'routine',
    source: 'protocol',
    taskKey: 'command.debrief',
    frequencyTier: 'daily',
  });

  return specs;
}

export function buildProtocolSpecs(
  profile: OperatorProfile
): Omit<ProtocolItem, 'id' | 'date' | 'done'>[] {
  const unlocked = getUnlockedStages(profile);
  const current = profile.currentStage;
  const specs: Omit<ProtocolItem, 'id' | 'date' | 'done'>[] = [];
  const seen = new Set<string>();

  for (const stage of STAGE_ORDER) {
    if (!unlocked.includes(stage)) continue;
    const tier = tierForStage(stage, current);
    const [a, b] = PROTOCOL_TEMPLATES[stage];
    const keys = STAGE_TASK_KEYS[stage].protocol;
    const labels = tier === 'maintenance' ? [a] : [a, b];
    const keyList = tier === 'maintenance' ? [keys[0]] : keys;

    keyList.forEach((taskKey, i) => {
      if (seen.has(taskKey)) return;
      seen.add(taskKey);
      specs.push({
        label: labels[i],
        stage,
        priority: tier === 'intensive' ? 'critical' : 'routine',
        phase: stage === current ? 'any' : 'any',
        taskKey,
        frequencyTier: tier,
      });
    });
  }

  return specs;
}

export async function onStageAdvance(
  profile: OperatorProfile,
  newStage: StageId
): Promise<OperatorProfile> {
  const unlocked = new Set(getUnlockedStages(profile));
  unlocked.add(newStage);
  return {
    ...profile,
    currentStage: newStage,
    unlockedStages: STAGE_ORDER.filter((s) => unlocked.has(s)),
  };
}

export async function onStageDemotion(
  profile: OperatorProfile,
  newStage: StageId
): Promise<OperatorProfile> {
  const unlocked = new Set(getUnlockedStages(profile));
  unlocked.add(newStage);
  return {
    ...profile,
    currentStage: newStage,
    unlockedStages: STAGE_ORDER.filter((s) => unlocked.has(s)),
  };
}
