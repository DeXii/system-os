import { useEffect, useState } from 'react';
import { db, todayKey, uid } from '@/core/db';
import { emitKernel } from '@/core/events/event-bus';
import type { BftEvent } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

export function BftPanel({ onSaved }: Props) {
  const [history, setHistory] = useState<BftEvent[]>([]);
  const [form, setForm] = useState({
    maxPullups: '',
    maxDips: '',
    plankSec: '',
    hangSec: '',
  });

  const load = async () => {
    setHistory(await db.bftEvents.orderBy('date').reverse().limit(5).toArray());
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    await db.bftEvents.add({
      id: uid(),
      date: todayKey(),
      maxPullups: Number(form.maxPullups) || 0,
      maxDips: Number(form.maxDips) || 0,
      plankSec: Number(form.plankSec) || 0,
      hangSec: form.hangSec ? Number(form.hangSec) : undefined,
    });
    await emitKernel('foundation', 'Bar Fitness Test записан', 'success');
    setForm({ maxPullups: '', maxDips: '', plankSec: '', hangSec: '' });
    load();
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Bar Fitness Test</div>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          Вместо полного ACFT: подтягивания, брусья, планка, вис (раз в ~12 недель). BFT — базовый
          тест силы на турнике.
        </p>
      </GlossaryZone>
      <div className="grid-2">
        <div className="form-row">
          <label className="label">Подтягивания (макс)</label>
          <input
            className="input"
            value={form.maxPullups}
            onChange={(e) => setForm({ ...form, maxPullups: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Брусья (макс)</label>
          <input
            className="input"
            value={form.maxDips}
            onChange={(e) => setForm({ ...form, maxDips: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Планка (сек)</label>
          <input
            className="input"
            value={form.plankSec}
            onChange={(e) => setForm({ ...form, plankSec: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label className="label">Вис (сек)</label>
          <input
            className="input"
            value={form.hangSec}
            onChange={(e) => setForm({ ...form, hangSec: e.target.value })}
          />
        </div>
      </div>
      <button type="button" className="btn btn-primary" onClick={save}>
        Записать BFT
      </button>
      {history[0] && (
        <p style={{ marginTop: 8, fontSize: 12 }}>
          Последний: {history[0].date} — pull {history[0].maxPullups}, dip {history[0].maxDips}
        </p>
      )}
    </div>
  );
}
