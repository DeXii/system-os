import { useEffect, useState } from 'react';
import { db } from '@/core/db';
import { getChessRatingTrend } from '@/core/engines/mind-metrics';
import type { ChessGoSession } from '@/core/domain/types';

export function ChessGoHistory() {
  const [history, setHistory] = useState<ChessGoSession[]>([]);
  const [trend, setTrend] = useState<{ date: string; rating: number }[]>([]);

  const load = async () => {
    setHistory(await db.chessGoSessions.orderBy('date').reverse().limit(10).toArray());
    setTrend(await getChessRatingTrend(30));
  };

  useEffect(() => {
    load();
  }, []);

  const maxR = Math.max(...trend.map((t) => t.rating), 1);

  return (
    <div className="panel">
      <div className="panel-title">История Chess/Go</div>
      {trend.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
            Рейтинг — 30 дней
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48 }}>
            {trend.map((t) => (
              <div
                key={t.date}
                title={`${t.date}: ${t.rating}`}
                style={{
                  flex: 1,
                  height: `${(t.rating / maxR) * 100}%`,
                  minHeight: 4,
                  background: 'var(--accent)',
                  opacity: 0.75,
                }}
              />
            ))}
          </div>
        </div>
      )}
      {history.map((h) => (
        <div key={h.id} className="kernel-line">
          {h.date} {h.game} {h.durationMin}мин · рейтинг {h.ratingAfter ?? h.rating ?? '—'}
          {h.platform ? ` · ${h.platform}` : ''}
        </div>
      ))}
      {!history.length && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Сессий пока нет</p>
      )}
    </div>
  );
}
