import type { ConstraintId } from '../../director/director-types';
import { COGNITIVE_RULES } from './cognitive.rules';
import { COMMUNICATION_RULES } from './communication.rules';
import { DATA_INTEGRITY_RULES } from './data-integrity.rules';
import { EQUIPMENT_RULES } from './equipment.rules';
import { READINESS_RULES } from './readiness.rules';
import { SCHEDULING_RULES } from './scheduling.rules';
import { TRAINING_RULES } from './training.rules';

const RULE_MAP: Record<ConstraintId, string[]> = {
  dataIntegrity: DATA_INTEGRITY_RULES,
  equipment: EQUIPMENT_RULES,
  readiness: READINESS_RULES,
  training: TRAINING_RULES,
  cognitive: COGNITIVE_RULES,
  communication: COMMUNICATION_RULES,
  scheduling: SCHEDULING_RULES,
  doctrine: ['Сверяй рекомендации с doctrine.rules из context.'],
};

export function renderConstraintBlock(ids: ConstraintId[]): string {
  const lines: string[] = [];
  for (const id of ids) {
    const rules = RULE_MAP[id];
    if (!rules?.length) continue;
    lines.push(`[${id}]`);
    for (const r of rules) lines.push(`- ${r}`);
  }
  return lines.length ? `ОГРАНИЧЕНИЯ:\n${lines.join('\n')}` : '';
}
