import { FloatingPortal, useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  anchor: HTMLElement | null;
  term: string;
  text: string;
  loading: boolean;
  tooltipId: string;
}

export function GlossaryContent({ open, anchor, term, text, loading, tooltipId }: Props) {
  const { refs, floatingStyles, context } = useFloating({
    open: open && !!anchor,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (anchor) refs.setReference(anchor);
  }, [anchor, refs]);

  if (!open || !anchor) return null;

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        id={tooltipId}
        role="tooltip"
        className={`glossary-tooltip ${open ? 'glossary-tooltip--visible' : ''}`}
        style={floatingStyles}
        data-floating-placement={context.placement}
      >
        <div className="glossary-tooltip-term">{term}</div>
        <div className="glossary-tooltip-text" aria-live="polite">
          {loading ? 'Загрузка…' : text}
        </div>
      </div>
    </FloatingPortal>
  );
}
