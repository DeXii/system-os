import { useCallback, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { useGlossaryContext } from './GlossaryContext';
import { useIsCoarsePointer } from './hooks/useIsCoarsePointer';

interface Props {
  term: string;
  children: ReactNode;
  context?: string;
}

const OPEN_DELAY_MS = 300;

export function GlossaryTrigger({ term, children, context }: Props) {
  const { scheduleOpen, cancelScheduled, open, close, isOpen, activeTerm, tooltipId } =
    useGlossaryContext();
  const coarse = useIsCoarsePointer();
  const ref = useRef<HTMLSpanElement>(null);
  const triggerId = useId();
  const isActive = isOpen && activeTerm === term;

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    scheduleOpen({ term, anchor: el, context });
  }, [term, context, scheduleOpen]);

  const hide = useCallback(() => {
    cancelScheduled();
    if (!coarse) close();
  }, [cancelScheduled, close, coarse]);

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!coarse) return;
      e.preventDefault();
      const el = ref.current;
      if (!el) return;
      if (isActive) {
        close();
      } else {
        open({ term, anchor: el, context });
      }
    },
    [coarse, isActive, term, context, open, close]
  );

  return (
    <span
      ref={ref}
      id={triggerId}
      className="glossary-term"
      tabIndex={0}
      aria-describedby={isActive ? tooltipId : undefined}
      onMouseEnter={coarse ? undefined : show}
      onMouseLeave={coarse ? undefined : hide}
      onFocus={coarse ? undefined : show}
      onBlur={coarse ? undefined : hide}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

export { OPEN_DELAY_MS };
