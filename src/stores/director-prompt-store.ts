import type { WorkoutContextOptions } from '@/core/ai/context-builder';
import type { ContextLookbackDays, TaskId } from '@/core/ai/director-tasks';
import type { ModuleId } from '@/core/domain/types';

export type DirectorPromptSource = 'run' | 'preview';

export interface LastDirectorPrompt {
  taskId: TaskId;
  scope: ModuleId | 'full';
  lookbackDays: ContextLookbackDays;
  system: string;
  user: string;
  contextJson: string;
  contextJsonLength: number;
  workoutContext?: WorkoutContextOptions;
  createdAt: string;
  source: DirectorPromptSource;
}

let lastPrompt: LastDirectorPrompt | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function getLastDirectorPrompt(): LastDirectorPrompt | null {
  return lastPrompt;
}

export function setLastDirectorPrompt(prompt: LastDirectorPrompt): void {
  lastPrompt = prompt;
  notify();
}

export function subscribeDirectorPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
