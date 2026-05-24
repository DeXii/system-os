import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const LINES = [
  'Initializing kernel...',
  'Loading tactical modules...',
  'Mounting IndexedDB...',
  'DIRECTOR subsystem: standby',
  'AYANAKOJI OS ready.',
];

export function BootScreen({ onComplete }: Props) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (lineIndex < LINES.length) {
      const t = setTimeout(() => setLineIndex((i) => i + 1), 400);
      return () => clearTimeout(t);
    }
    const done = setTimeout(onComplete, 500);
    return () => clearTimeout(done);
  }, [lineIndex, onComplete]);

  return (
    <div className="boot-screen">
      <div className="boot-logo">AYANAKOJI</div>
      {LINES.slice(0, lineIndex).map((l) => (
        <div key={l} className="boot-line">
          {'> '}
          {l}
        </div>
      ))}
    </div>
  );
}
