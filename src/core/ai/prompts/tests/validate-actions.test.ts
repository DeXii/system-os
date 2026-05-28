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
});
