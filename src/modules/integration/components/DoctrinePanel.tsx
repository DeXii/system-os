import { useEffect, useState } from 'react';
import { getOrCreateDoctrine, saveDoctrine } from '@/core/engines/doctrine-service';

interface Props {
  onSaved: () => void;
}

export function DoctrinePanel({ onSaved }: Props) {
  const [rules, setRules] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const load = async () => {
    const d = await getOrCreateDoctrine();
    setRules(d.rules);
  };

  useEffect(() => {
    load();
  }, []);

  const addRule = async () => {
    if (!draft.trim() || rules.length >= 10) return;
    const next = [...rules, draft.trim()];
    await saveDoctrine(next);
    setRules(next);
    setDraft('');
    onSaved();
  };

  const removeRule = async (index: number) => {
    const next = rules.filter((_, i) => i !== index);
    await saveDoctrine(next);
    setRules(next);
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Operator Doctrine · 5–10 rules</div>
      <ol style={{ fontSize: 12, marginBottom: 12, paddingLeft: 20 }}>
        {rules.map((r, i) => (
          <li key={r} style={{ marginBottom: 6 }}>
            {r}
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginLeft: 8 }}
              onClick={() => removeRule(i)}
            >
              ×
            </button>
          </li>
        ))}
      </ol>
      <div className="form-row">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Новое правило..."
          disabled={rules.length >= 10}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={addRule}
        disabled={rules.length >= 10}
      >
        Добавить правило
      </button>
    </div>
  );
}
