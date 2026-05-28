import { buildDisplayPrompt, buildDisplayPromptParts } from './prompt-display/build-display-prompt';
import type { LastDirectorPrompt } from '@/stores/director-prompt-store';

/** @deprecated Use buildDisplayPromptParts with LastDirectorPrompt */
export function formatPromptForExternalAgent(system: string, user: string): string {
  const stub: LastDirectorPrompt = {
    taskId: 'morningBriefing',
    scope: 'full',
    lookbackDays: 7,
    system,
    user,
    contextJson: '',
    contextJsonLength: 0,
    createdAt: new Date().toISOString(),
    source: 'preview',
  };
  return buildDisplayPrompt(stub);
}

export { buildDisplayPrompt, buildDisplayPromptParts };
