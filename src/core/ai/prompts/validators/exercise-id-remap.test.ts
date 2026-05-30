import { describe, expect, it } from 'vitest';
import { remapExerciseId } from './exercise-id-remap';

describe('remapExerciseId', () => {
  const allowed = ['hift_pullup', 'hift_dip'];
  const catalog = [
    { id: 'hift_pullup', name: 'Подтягивания' },
    { id: 'hift_dip', name: 'Дипсы на брусьях' },
  ];

  it('returns same id when allowed', () => {
    expect(remapExerciseId('hift_pullup', allowed, catalog)).toBe('hift_pullup');
  });

  it('maps pull_ups alias', () => {
    expect(remapExerciseId('pull_ups', allowed, catalog)).toBe('hift_pullup');
  });

  it('maps by catalog name', () => {
    expect(remapExerciseId('подтягивания', allowed, catalog)).toBe('hift_pullup');
  });

  it('returns null when no match', () => {
    expect(remapExerciseId('unknown_exercise', allowed, catalog)).toBeNull();
  });
});
