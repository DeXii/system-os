import { useState } from 'react';
import { todayKey } from '@/core/db';
import { afterChessGoComplete } from '@/core/engines/os-kernel';
import { CHESS_PLATFORMS } from '@/content/mind-protocols';
import type { ChessGoSession, ChessPlatform } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onSaved: () => void;
}

export function ChessGoJournalPanel({ onSaved }: Props) {
  const [form, setForm] = useState({
    game: 'chess' as 'chess' | 'go',
    durationMin: '30',
    ratingAfter: '',
    platform: 'lichess' as ChessPlatform,
    notes: '',
  });

  const save = async () => {
    const session: Omit<ChessGoSession, 'id'> = {
      date: todayKey(),
      game: form.game,
      durationMin: Number(form.durationMin) || 0,
      ratingAfter: form.ratingAfter ? Number(form.ratingAfter) : undefined,
      platform: form.platform,
      notes: form.notes || undefined,
    };
    await afterChessGoComplete(session);
    setForm({
      game: form.game,
      durationMin: '30',
      ratingAfter: '',
      platform: form.platform,
      notes: '',
    });
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-title">Chess / Go — журнал</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Chess и Go в mind — тренировка расчёта, терпения и стратегии; сессии идут в readiness
          этапа.
        </p>
      </GlossaryZone>
      <div className="form-row">
        <select
          className="select"
          value={form.game}
          onChange={(e) => setForm({ ...form, game: e.target.value as 'chess' | 'go' })}
        >
          <option value="chess">Шахматы</option>
          <option value="go">Go</option>
        </select>
      </div>
      <div className="form-row">
        <label className="label">Минут</label>
        <input
          className="input"
          value={form.durationMin}
          onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Рейтинг после сессии</label>
        <input
          className="input"
          value={form.ratingAfter}
          onChange={(e) => setForm({ ...form, ratingAfter: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="label">Платформа</label>
        <select
          className="select"
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value as ChessPlatform })}
        >
          {CHESS_PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="label">Заметки</label>
        <textarea
          className="textarea"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <button type="button" className="btn btn-primary" onClick={save}>
        Записать сессию
      </button>
    </div>
  );
}
