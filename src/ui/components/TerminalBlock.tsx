import { useState } from 'react';

interface Props {
  children: string;
  maxHeight?: number;
  className?: string;
}

export function TerminalBlock({ children, maxHeight = 160, className = '' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = children.length > 280 || children.split('\n').length > 8;

  if (!children.trim()) return null;

  return (
    <div className={className}>
      <div
        className={`terminal-block ${expanded ? 'expanded' : ''}`}
        style={!expanded && needsToggle ? { maxHeight } : undefined}
      >
        {children}
      </div>
      {needsToggle && (
        <button
          type="button"
          className="terminal-block-toggle"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Свернуть' : 'Развернуть'}
        </button>
      )}
    </div>
  );
}
