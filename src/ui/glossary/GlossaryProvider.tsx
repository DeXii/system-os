import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { resolveGlossaryExplanation } from '@/core/glossary/glossary-service';
import { GlossaryContent } from './GlossaryContent';
import {
  GlossaryContext,
  type GlossaryContextValue,
  type GlossaryOpenRequest,
} from './GlossaryContext';
import { OPEN_DELAY_MS } from './GlossaryTrigger';
import { useIsCoarsePointer } from './hooks/useIsCoarsePointer';

interface Props {
  children: ReactNode;
}

export function GlossaryProvider({ children }: Props) {
  const tooltipId = useId();
  const coarse = useIsCoarsePointer();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGen = useRef(0);

  const isOpen = activeTerm != null && anchor != null;

  const loadExplanation = useCallback(async (term: string, context?: string) => {
    const gen = ++requestGen.current;
    setLoading(true);
    setText('');
    const result = await resolveGlossaryExplanation(term, context);
    if (gen !== requestGen.current) return;
    setText(result.text);
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    requestGen.current++;
    setAnchor(null);
    setActiveTerm(null);
    setText('');
    setLoading(false);
  }, []);

  const open = useCallback(
    (req: GlossaryOpenRequest) => {
      if (openTimer.current) {
        clearTimeout(openTimer.current);
        openTimer.current = null;
      }
      setAnchor(req.anchor);
      setActiveTerm(req.term);
      void loadExplanation(req.term, req.context);
    },
    [loadExplanation]
  );

  const scheduleOpen = useCallback(
    (req: GlossaryOpenRequest) => {
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = setTimeout(() => {
        openTimer.current = null;
        open(req);
      }, OPEN_DELAY_MS);
    },
    [open]
  );

  const cancelScheduled = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (!coarse || !isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchor?.contains(target)) return;
      const tooltip = document.getElementById(tooltipId);
      if (tooltip?.contains(target)) return;
      close();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [coarse, isOpen, anchor, tooltipId, close]);

  const value = useMemo<GlossaryContextValue>(
    () => ({
      open,
      close,
      scheduleOpen,
      cancelScheduled,
      activeTerm,
      isOpen,
      tooltipId,
    }),
    [open, close, scheduleOpen, cancelScheduled, activeTerm, isOpen, tooltipId]
  );

  return (
    <GlossaryContext.Provider value={value}>
      {children}
      <GlossaryContent
        open={isOpen}
        anchor={anchor}
        term={activeTerm ?? ''}
        text={text}
        loading={loading}
        tooltipId={tooltipId}
      />
    </GlossaryContext.Provider>
  );
}
