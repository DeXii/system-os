import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../builders/build-system-prompt';

describe('buildSystemPrompt', () => {
  it('includes Kiyotaka persona and is shorter than legacy monolith per task', () => {
    const prompt = buildSystemPrompt('planHift');
    expect(prompt).toContain('Аянокоджи');
    expect(prompt).toContain('HIFT');
    expect(prompt).toContain('set_workout_plan');
    expect(prompt.length).toBeLessThan(4500);
  });

  it('influence coach uses tactical communication rules', () => {
    const prompt = buildSystemPrompt('influenceCoach');
    expect(prompt).toContain('маска');
    expect(prompt).toContain('дисциплина информации');
    expect(prompt).toContain('Тактика класса');
    expect(prompt).not.toContain('без манипуляций');
  });

  it('morning briefing allows add_mission only in allowed list', () => {
    const prompt = buildSystemPrompt('morningBriefing');
    expect(prompt).toContain('add_mission');
    expect(prompt).not.toContain('set_workout_plan');
  });
});
