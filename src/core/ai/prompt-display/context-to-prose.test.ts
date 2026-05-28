import { describe, expect, it } from 'vitest';
import { buildDisplayPrompt } from './build-display-prompt';
import { contextJsonToProse } from './context-to-prose';
import type { LastDirectorPrompt } from '@/stores/director-prompt-store';

describe('contextJsonToProse', () => {
  it('returns нету данных for empty object', () => {
    expect(contextJsonToProse('{}')).toContain('нету данных');
  });

  it('formats null operator as нету данных', () => {
    const json = JSON.stringify({
      fact: { operator: null },
    });
    const prose = contextJsonToProse(json);
    expect(prose).toContain('Оператор');
    expect(prose).toContain('нету данных');
    expect(prose).not.toMatch(/^\s*\{/m);
  });

  it('formats missions as readable list not JSON', () => {
    const json = JSON.stringify({
      fact: {
        today: {
          missions: [
            { title: 'Утренняя разминка', status: 'pending', priority: 'routine' },
          ],
        },
      },
    });
    const prose = contextJsonToProse(json);
    expect(prose).toContain('Утренняя разминка');
    expect(prose).toContain('pending');
    expect(prose).not.toContain('"title"');
  });
});

describe('buildDisplayPrompt', () => {
  const base: LastDirectorPrompt = {
    taskId: 'morningBriefing',
    scope: 'command',
    lookbackDays: 7,
    system: 'Ты DIRECTOR.',
    user: [
      'Контекст оператора:',
      '{"fact":{"today":{"missions":[]}}}',
      '',
      'Выполни задачу: morningBriefing',
      'Разрешённые actions: add_mission',
    ].join('\n'),
    contextJson: JSON.stringify({
      fact: {
        today: {
          missions: [{ title: 'Тест', status: 'done', priority: 'critical' }],
        },
      },
    }),
    contextJsonLength: 10,
    createdAt: '2026-05-28T12:00:00.000Z',
    source: 'run',
  };

  it('produces full document with system and task sections', () => {
    const text = buildDisplayPrompt(base);
    expect(text).toContain('--- SYSTEM CORE ---');
    expect(text).toContain('--- TASK ---');
    expect(text).toContain('[ДАННЫЕ ОПЕРАТОРА]');
    expect(text).toContain('Ты DIRECTOR — операционный интеллект');
    expect(text).toContain('[СИСТЕМА ЗАДАЧИ]');
    expect(text).toContain('Тест');
  });

  it('does not include raw JSON in task section', () => {
    const text = buildDisplayPrompt(base);
    const taskStart = text.indexOf('--- TASK ---');
    const taskBlock = text.slice(taskStart);
    expect(taskBlock).not.toContain('{"fact"');
    expect(taskBlock).not.toContain('"missions"');
  });
});
