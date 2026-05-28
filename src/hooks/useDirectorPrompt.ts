import { useEffect, useState } from 'react';
import {
  getLastDirectorPrompt,
  subscribeDirectorPrompt,
  type LastDirectorPrompt,
} from '@/stores/director-prompt-store';

export function useDirectorPrompt(): LastDirectorPrompt | null {
  const [prompt, setPrompt] = useState(getLastDirectorPrompt);
  useEffect(() => subscribeDirectorPrompt(() => setPrompt(getLastDirectorPrompt())), []);
  return prompt;
}
