import { createContext, useContext } from 'react';

export type GlossaryOpenRequest = {
  term: string;
  anchor: HTMLElement;
  context?: string;
};

export type GlossaryContextValue = {
  open: (req: GlossaryOpenRequest) => void;
  close: () => void;
  scheduleOpen: (req: GlossaryOpenRequest) => void;
  cancelScheduled: () => void;
  activeTerm: string | null;
  isOpen: boolean;
  tooltipId: string;
};

export const GlossaryContext = createContext<GlossaryContextValue | null>(null);

export function useGlossaryContext(): GlossaryContextValue {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossaryContext must be used within GlossaryProvider');
  return ctx;
}
