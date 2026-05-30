import { describe, expect, it } from 'vitest';
import { validateAndFilterActions } from '../validators/validate-actions';

describe('validateAndFilterActions', () => {
  it('drops disallowed action types', () => {
    const { actions, dropped } = validateAndFilterActions(
      [{ type: 'set_workout_plan', payload: { exercises: [{ exerciseId: 'x', sets: 1 }] } }],
      {
        allowedActions: ['add_mission'],
        context: {},
      }
    );
    expect(actions).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });

  it('filters exerciseId not in allowed list', () => {
    const { actions } = validateAndFilterActions(
      [
        {
          type: 'set_workout_plan',
          payload: {
            exercises: [{ exerciseId: 'forbidden_id', sets: 1 }],
          },
        },
      ],
      {
        allowedActions: ['set_workout_plan'],
        context: { allowedExerciseIds: ['hift_pullup'] },
      }
    );
    expect(actions).toHaveLength(0);
  });

  it('remaps common alias exerciseId to allowed catalog id', () => {
    const { actions, dropped } = validateAndFilterActions(
      [
        {
          type: 'set_workout_plan',
          payload: {
            exercises: [{ exerciseId: 'pull_ups', sets: 3, targetReps: 6 }],
          },
        },
      ],
      {
        allowedActions: ['set_workout_plan'],
        context: {
          allowedExerciseIds: ['hift_pullup'],
          exerciseCatalog: [{ id: 'hift_pullup', name: 'Подтягивания' }],
        },
      }
    );
    expect(dropped).toHaveLength(0);
    expect(actions).toHaveLength(1);
    const ex = (actions[0].payload.exercises as { exerciseId: string }[])[0];
    expect(ex.exerciseId).toBe('hift_pullup');
  });

  it('accepts valid add_mission', () => {
    const { actions } = validateAndFilterActions(
      [{ type: 'add_mission', payload: { title: 'Test mission' } }],
      {
        allowedActions: ['add_mission'],
        context: {},
      }
    );
    expect(actions).toHaveLength(1);
  });

  it('coerces string numeric fields in set_workout_plan', () => {
    const { actions } = validateAndFilterActions(
      [
        {
          type: 'set_workout_plan',
          payload: {
            kind: 'hift',
            exercises: [{ exerciseId: 'hift_pullup', sets: '3', targetReps: '8', restSec: '60' }],
          },
        },
      ],
      {
        allowedActions: ['set_workout_plan'],
        context: { allowedExerciseIds: ['hift_pullup'] },
      }
    );
    expect(actions).toHaveLength(1);
    const ex = (actions[0].payload.exercises as { sets: number }[])[0];
    expect(ex.sets).toBe(3);
  });
});
