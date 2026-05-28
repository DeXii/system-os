import { describe, expect, it } from 'vitest';
import { buildCorePrompt } from '../prompts/base/core.prompt';
import { buildDisplayPromptParts } from './build-display-prompt';
import type { LastDirectorPrompt } from '@/stores/director-prompt-store';

const base: LastDirectorPrompt = {
  taskId: 'morningBriefing',
  scope: 'command',
  lookbackDays: 7,
  system: 'FULL GROQ SYSTEM WITH TASK LAYER AND add_mission',
  user: [
    'Контекст оператора:',
    '{"fact":{"today":{"missions":[{"title":"Test","status":"pending"}]}}}',
    '',
    'Выполни задачу: morningBriefing',
    'Разрешённые actions: add_mission',
  ].join('\n'),
  contextJson: JSON.stringify({
    fact: { today: { missions: [{ title: 'Test', status: 'pending' }] } },
  }),
  contextJsonLength: 10,
  createdAt: '2026-05-28T12:00:00.000Z',
  source: 'preview',
};

describe('buildDisplayPromptParts', () => {
  it('systemCore is core only, not full groq system', () => {
    const parts = buildDisplayPromptParts(base);
    expect(parts.systemCore).toBe(buildCorePrompt().trim());
    expect(parts.systemCore).not.toBe(base.system.trim());
    expect(parts.systemCore).not.toContain('Разрешённые actions');
    expect(parts.systemCore).not.toContain('add_mission');
    expect(parts.systemCore).toContain('ACTION LIMIT');
  });

  it('task includes task system layer, operator data, and meta', () => {
    const parts = buildDisplayPromptParts(base);
    expect(parts.task).toContain('[СИСТЕМА ЗАДАЧИ]');
    expect(parts.task).toContain('OUTPUT DISCIPLINE');
    expect(parts.task).toContain('[ДАННЫЕ ОПЕРАТОРА]');
    expect(parts.task).toContain('Test');
    expect(parts.task).not.toContain('{"fact"');
    expect(parts.task).toContain('[ЗАДАЧА]');
    expect(parts.task).toContain('morningBriefing');
    expect(parts.full).toContain('--- SYSTEM CORE ---');
    expect(parts.full).toContain('--- TASK ---');
  });
});
