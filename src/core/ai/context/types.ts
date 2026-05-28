import type { GppSubtype, WorkoutKind } from '../../domain/types';

export type ContextLookbackDays = 7 | 14 | 30;

export interface WorkoutContextOptions {
  kind: WorkoutKind;
  gppSubtype?: GppSubtype;
}
