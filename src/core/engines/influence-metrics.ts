import { db, dateKeyDaysAgo, todayKey } from '../db';
import type { ReadinessScores } from '../domain/types';
import { getContactsSummary } from './contact-metrics';
import { getInfluenceParams } from './influence-params';
import { INFLUENCE_THRESHOLDS as T } from './influence-thresholds';

export interface InfluenceDirective {
  calculationLine: string;
  actionLine: string;
  denyLine?: string;
}

export async function getInfluenceOpsSummary(): Promise<{
  miCount7d: number;
  nudgeCount7d: number;
  protocolDays7d: number;
  biasCount7d: number;
  observationCount7d: number;
  total7d: number;
  miStreak: number;
  protocolToday: boolean;
}> {
  const since = dateKeyDaysAgo(6);
  const entries = await db.influenceEntries.where('date').aboveOrEqual(since).toArray();

  let miCount7d = 0;
  let nudgeCount7d = 0;
  let biasCount7d = 0;
  let observationCount7d = 0;
  const protocolDates = new Set<string>();

  for (const e of entries) {
    switch (e.type) {
      case 'mi':
        miCount7d++;
        break;
      case 'nudge':
        nudgeCount7d++;
        break;
      case 'bias':
        biasCount7d++;
        break;
      case 'observation':
      case 'debrief':
        observationCount7d++;
        break;
      case 'protocol':
        protocolDates.add(e.date);
        break;
      default:
        break;
    }
  }

  return {
    miCount7d,
    nudgeCount7d,
    protocolDays7d: protocolDates.size,
    biasCount7d,
    observationCount7d,
    total7d: entries.length,
    miStreak: await getMiStreak(),
    protocolToday: await hadProtocolToday(),
  };
}

export async function getMiStreak(): Promise<number> {
  const since = dateKeyDaysAgo(29);
  const entries = await db.influenceEntries
    .where('date')
    .aboveOrEqual(since)
    .filter((e) => e.type === 'mi')
    .toArray();
  const miDates = new Set(entries.map((e) => e.date));

  let streak = 0;
  for (let d = 0; d < 30; d++) {
    const key = dateKeyDaysAgo(d);
    if (miDates.has(key)) streak++;
    else break;
  }
  return streak;
}

export async function hadProtocolToday(): Promise<boolean> {
  return (
    (await db.influenceEntries
      .where('date')
      .equals(todayKey())
      .filter((e) => e.type === 'protocol')
      .count()) > 0
  );
}

export function shouldThrottleInfluence(readiness: ReadinessScores): boolean {
  return (
    readiness.foundation < T.throttleFoundationBelow ||
    readiness.regulation < T.throttleRegulationBelow ||
    readiness.mind < T.throttleMindBelow
  );
}

export async function buildInfluenceDirective(
  readiness?: ReadinessScores
): Promise<InfluenceDirective> {
  const { computeReadiness } = await import('./readiness');
  const r = readiness ?? (await computeReadiness());
  const ops = await getInfluenceOpsSummary();
  const params = await getInfluenceParams();
  const throttle = shouldThrottleInfluence(r);
  const debrief = await getContactsSummary();

  const calcParts = [
    `influence=${r.influence}`,
    `mi_7d=${ops.miCount7d}`,
    `mi_streak=${ops.miStreak}`,
    `mi_depth=${(params.miDepthEma * 100).toFixed(0)}%`,
    `mi_efficacy=${(params.miEfficacyEma * 100).toFixed(0)}%`,
    `dose_target/wk=${params.miDoseTargetWeekly.toFixed(1)}`,
    `debrief_due=${debrief.needingDebrief.length}`,
    throttle ? 'throttle=1' : null,
  ].filter(Boolean);

  let action =
    `MI 1× (influence.mi); protocol перед контактом (influence.protocol); цель ${Math.round(params.miDoseTargetWeekly)}/нед.`;
  if (throttle) {
    action = 'Только influence.protocol + log_note; новые контакты и операции — отложить.';
  } else if (debrief.needingDebrief[0]) {
    const c = debrief.needingDebrief[0];
    action = `Debrief: ${c.codename} (influence.observation); затем MI по досье.`;
  } else if (ops.miStreak < T.miStreakMinForRoutine) {
    action = 'MI сегодня — разрыв streak; минимум situation + openQuestions + summarize.';
  } else if (params.miEfficacyEma < T.miEfficacyLow) {
    action = 'Снизить новые контакты; усилить debrief и protocol перед следующим касанием.';
  } else if (!ops.protocolToday) {
    action = 'Influence Protocol сегодня (influence.protocol) перед любым контактом.';
  }

  const denyLine = throttle
    ? '[ОТКАЗ] Тактика класса: foundation/regulation/mind ниже порога influence throttle.'
    : undefined;

  return {
    calculationLine: `[РАСЧЁТ] ${calcParts.join(' · ')}`,
    actionLine: `[ДЕЙСТВИЕ] ${action}`,
    denyLine,
  };
}

export function formatInfluenceDirectiveForPrompt(d: InfluenceDirective): string {
  return [d.calculationLine, d.actionLine, d.denyLine].filter(Boolean).join('\n');
}
