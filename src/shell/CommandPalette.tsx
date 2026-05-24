import { useEffect, useState } from 'react';
import type { ModuleId } from '@/core/domain/types';

export interface PaletteAction {
  id: string;
  label: string;
  run: () => void;
}

interface Props {
  open: boolean;
  actions: PaletteAction[];
  onClose: () => void;
}

export function CommandPalette({ open, actions, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter' && filtered[selected]) {
        filtered[selected].run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, selected, onClose]);

  if (!open) return null;

  return (
    <div className="palette-overlay" onClick={onClose} role="presentation">
      <div className="palette-box" onClick={(e) => e.stopPropagation()}>
        <input
          className="palette-input"
          placeholder="Команда... (Ctrl+K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          autoFocus
        />
        {filtered.map((a, i) => (
          <button
            key={a.id}
            type="button"
            className={`palette-item ${i === selected ? 'selected' : ''}`}
            onClick={() => {
              a.run();
              onClose();
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useCommandPaletteNavigation(
  setModule: (m: ModuleId) => void,
  extras: PaletteAction[] = []
): PaletteAction[] {
  return [
    { id: 'cmd', label: 'Открыть COMMAND', run: () => setModule('command') },
    { id: 'fnd', label: 'Открыть FOUNDATION', run: () => setModule('foundation') },
    { id: 'reg', label: 'Открыть REGULATION', run: () => setModule('regulation') },
    { id: 'mind', label: 'Открыть MIND', run: () => setModule('mind') },
    { id: 'inf', label: 'Открыть INFLUENCE', run: () => setModule('influence') },
    { id: 'lib', label: 'Открыть LIBRARY', run: () => setModule('library') },
    { id: 'dir', label: 'Открыть DIRECTOR', run: () => setModule('director') },
    { id: 'arc', label: 'Открыть ARCHIVE', run: () => setModule('archive') },
    ...extras,
  ];
}
