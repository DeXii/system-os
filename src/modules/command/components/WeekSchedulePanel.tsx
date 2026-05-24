import { useCallback, useEffect, useState } from 'react';
import { todayKey, tomorrowKey, weekdayIndex } from '@/core/db';
import { completeScheduleSlot } from '@/core/engines/os-kernel';
import {
  buildTodayQueue,
  getSlotsForDate,
  getWeekTemplate,
  moveSlotToDate,
  markSlotSkipped,
} from '@/core/engines/week-schedule';
import type { ScheduleSlot, WeekdayIndex } from '@/core/domain/types';
import { GlossaryZone } from '@/ui/glossary';

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface Props {
  onChanged: () => void;
}

export function WeekSchedulePanel({ onChanged }: Props) {
  const [queue, setQueue] = useState<ScheduleSlot[]>([]);
  const [weekCounts, setWeekCounts] = useState<Record<number, number>>({});
  const today = todayKey();
  const todayWd = weekdayIndex();

  const load = useCallback(async () => {
    setQueue(await buildTodayQueue(today));
    const template = await getWeekTemplate();
    const counts: Record<number, number> = {};
    (Object.keys(template.slots) as unknown as WeekdayIndex[]).forEach((d) => {
      counts[d] = template.slots[d]?.length ?? 0;
    });
    setWeekCounts(counts);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDone = async (slot: ScheduleSlot) => {
    if (slot.status === 'done') return;
    await completeScheduleSlot(slot.id, today);
    await load();
    onChanged();
  };

  const moveTomorrow = async (slot: ScheduleSlot) => {
    await moveSlotToDate(slot.id, today, tomorrowKey());
    await load();
    onChanged();
  };

  const skip = async (slot: ScheduleSlot) => {
    await markSlotSkipped(slot.id, today);
    await load();
    onChanged();
  };

  const bumpTime = async (slot: ScheduleSlot) => {
    const slots = await getSlotsForDate(today);
    const [h, m] = (slot.optionalStartTime ?? '08:00').split(':').map(Number);
    const nh = h + Math.floor((m + 30) / 60);
    const nm = (m + 30) % 60;
    const updated = slots.map((s) =>
      s.id === slot.id
        ? { ...s, optionalStartTime: `${String(nh % 24).padStart(2, '0')}:${String(nm).padStart(2, '0')}` }
        : s
    );
    const { saveDayOverride } = await import('@/core/engines/week-schedule');
    await saveDayOverride(today, updated);
    await load();
  };

  return (
    <div className="panel" style={{ marginBottom: '1rem' }}>
      <div className="panel-title">WEEK OPS — график 7 дней</div>
      <GlossaryZone>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Week ops — слоты mission и protocol на неделю. Today queue — порядок выполнения на сегодня
          в COMMAND.
        </p>
      </GlossaryZone>
      <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              border: i === todayWd ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 4,
              background: i === todayWd ? 'rgba(0,255,136,0.08)' : 'transparent',
            }}
          >
            {label}
            {weekCounts[i] ? ` (${weekCounts[i]})` : ''}
          </div>
        ))}
      </div>

      <div className="panel-title" style={{ fontSize: 12, marginTop: 8 }}>
        TODAY QUEUE — порядок выполнения
      </div>
      <ul className="mission-list">
        {queue.map((slot) => (
          <li
            key={slot.id}
            className={`mission-item ${slot.priority === 'critical' ? 'critical' : ''}`}
            style={{ opacity: slot.status === 'skipped' ? 0.5 : 1 }}
          >
            <input
              type="checkbox"
              checked={slot.status === 'done'}
              disabled={slot.status === 'skipped'}
              onChange={() => toggleDone(slot)}
            />
            <div style={{ flex: 1 }}>
              <div className="mission-title">
                #{slot.rank} {slot.title}
              </div>
              <span className="tag">{slot.type}</span>
              {slot.stage && <span className="tag"> {slot.stage}</span>}
              {slot.optionalStartTime && (
                <span className="tag"> {slot.optionalStartTime}</span>
              )}
            </div>
            {slot.status === 'pending' && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm" onClick={() => moveTomorrow(slot)}>
                  Завтра
                </button>
                <button type="button" className="btn btn-sm" onClick={() => bumpTime(slot)}>
                  +30м
                </button>
                <button type="button" className="btn btn-sm" onClick={() => skip(slot)}>
                  Пропуск
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {queue.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Очередь пуста — откройте день заново.</p>
      )}
    </div>
  );
}
