import { describe, expect, it } from 'vitest';
import { parseAiActions, stripActionsBlock } from './director-response-parser';

describe('parseAiActions', () => {
  it('picks last non-empty block with set_workout_plan in Действия OS section', () => {
    const text = `## Вывод
Кратко.

## Действия OS
\`\`\`json
[]
\`\`\`

Ещё раз:

\`\`\`json
[
  {
    "type": "set_workout_plan",
    "payload": {
      "kind": "hift",
      "exercises": [{ "exerciseId": "hift_pullup", "sets": 3, "targetReps": 6 }]
    }
  }
]
\`\`\``;

    const actions = parseAiActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('set_workout_plan');
  });

  it('stripActionsBlock removes actions json from text', () => {
    const text = `## Вывод
Текст

## Действия OS
\`\`\`json
[{"type":"log_note","payload":{"text":"x"}}]
\`\`\``;
    expect(stripActionsBlock(text)).not.toContain('```json');
    expect(stripActionsBlock(text)).toContain('## Вывод');
  });
});
