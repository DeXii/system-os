import { describe, expect, it } from 'vitest';
import {
  buildCorePrompt,
  buildSystemPrompt,
  buildTaskSystemPrompt,
} from '../builders/build-system-prompt';

describe('buildCorePrompt', () => {
  it('is universal core without task templates or actions', () => {
    const core = buildCorePrompt();
    expect(core).toContain('DATA RULES');
    expect(core).toContain('SOURCE PRIORITY');
    expect(core).toContain('ANTI-PSEUDO-PLAN');
    expect(core).toContain('PRIMARY OBJECTIVE');
    expect(core).toContain('ACTION LIMIT');
    expect(core).toContain('SAFETY OVERRIDE');
    expect(core).toContain('NO FILLER');
    expect(core).toContain('LAYER DISCIPLINE');
    expect(core.length).toBeLessThan(1500);
    expect(core).not.toContain('add_mission');
    expect(core).not.toContain('set_workout_plan');
    expect(core).not.toContain('Утренний briefing');
    expect(core).not.toContain('influence.throttle');
    expect(core).not.toContain('Разрешённые actions');
    expect(core).not.toContain('ДОКТРИНА:');
  });
});

describe('buildTaskSystemPrompt', () => {
  it('morning briefing task layer has briefing template and actions', () => {
    const task = buildTaskSystemPrompt('morningBriefing');
    expect(task).toContain('add_mission');
    expect(task).not.toContain('set_workout_plan');
    expect(task).toMatch(/briefing|утрен|Утрен/i);
  });

  it('influence coach task layer formalizes throttle to actions', () => {
    const task = buildTaskSystemPrompt('influenceCoach');
    expect(task).toContain('influence.throttle');
    expect(task).toContain('add_protocol');
    expect(task).toContain('log_note');
  });

  it('plan workout has output discipline and no duplicate data listing', () => {
    const task = buildTaskSystemPrompt('planHift');
    expect(task).toContain('OUTPUT DISCIPLINE');
    expect(task).not.toContain('Данные: foundation (calibration');
  });

  it('morning briefing has no pseudo data field listing', () => {
    const task = buildTaskSystemPrompt('morningBriefing');
    expect(task).not.toContain('Данные: compliance');
  });
});

describe('buildSystemPrompt', () => {
  it('joins core and task layers', () => {
    const prompt = buildSystemPrompt('planHift');
    expect(prompt).toContain('PRIMARY OBJECTIVE');
    expect(prompt).toContain('FAIL CONDITION');
    expect(prompt).toContain('ANTI-OVERENGINEERING');
    expect(prompt).toContain('Минимально достаточ');
    expect(prompt).toContain('Почему сейчас');
    expect(prompt).toContain('нет данных');
    expect(prompt).toContain('set_workout_plan');
    expect(prompt).not.toContain('Аянокоджи');
    expect(prompt).not.toContain('тихий операционный');
  });

  it('morning briefing stays within length budget', () => {
    const prompt = buildSystemPrompt('morningBriefing');
    expect(prompt.length).toBeLessThan(2600);
    expect(prompt).toContain('add_mission');
    expect(prompt).not.toContain('set_workout_plan');
  });

  it('influence coach uses operational language not literary', () => {
    const prompt = buildSystemPrompt('influenceCoach');
    expect(prompt).toContain('низкой заметности');
    expect(prompt).not.toContain('маска');
    expect(prompt).not.toContain('тактика класса');
  });

  it('deep analysis keeps required actions', () => {
    const prompt = buildSystemPrompt('deepAnalysis14d');
    expect(prompt).toContain('add_mission');
    expect(prompt.length).toBeLessThan(2800);
  });
});
