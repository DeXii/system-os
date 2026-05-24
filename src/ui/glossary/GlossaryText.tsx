import { useMemo } from 'react';
import { segmentText } from '@/core/glossary/segment-text';
import { GlossaryTrigger } from './GlossaryTrigger';

interface Props {
  children: string;
  context?: string;
}

export function GlossaryText({ children, context }: Props) {
  const segments = useMemo(() => segmentText(children), [children]);

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <GlossaryTrigger key={i} term={seg.key} context={context}>
            {seg.value}
          </GlossaryTrigger>
        )
      )}
    </>
  );
}
