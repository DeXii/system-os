import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterProtocolComplete } from '@/core/engines/os-kernel';
import { TACTICAL_PROTOCOL_ITEMS } from '@/content/influence-protocols';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

export function InfluenceProtocolPanel({ onSaved }: Props) {
  const [checks, setChecks] = useState<boolean[]>(TACTICAL_PROTOCOL_ITEMS.map(() => false));

  const save = async () => {
    await afterProtocolComplete({
      date: todayKey(),
      type: 'protocol',
      protocolChecks: checks,
    });
    setChecks(TACTICAL_PROTOCOL_ITEMS.map(() => false));
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Influence Protocol · Тактика класса</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Ethics protocol и influence protocol — чеклист перед контактом; не заменяет MI и nudge
          journal.
        </p>
      </GlossaryZone>
      {TACTICAL_PROTOCOL_ITEMS.map((q, i) => (
        <div key={q} className="check-row">
          <input
            type="checkbox"
            checked={checks[i]}
            onChange={(e) => {
              const next = [...checks];
              next[i] = e.target.checked;
              setChecks(next);
            }}
          />
          <span style={{ fontSize: 13 }}>{q}</span>
        </div>
      ))}
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={save}>
        Протокол отмечен
      </button>
    </div>
  );
}
