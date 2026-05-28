import { useEffect, useState } from 'react';
import { dateKeyDaysAgo } from '@/core/db';
import { db } from '@/core/db';
import { getActiveGoal } from '@/core/engines/nutrition-goal-engine';

interface Props {
  reloadToken: number;
}

export function NutritionAnalyticsPanel({ reloadToken }: Props) {
  const [week, setWeek] = useState<{ date: string; protein: number }[]>([]);

  useEffect(() => {
    void (async () => {
      const goal = await getActiveGoal();
      const target = goal?.targetProtein ?? 100;
      const pts: { date: string; protein: number }[] = [];
      for (let d = 6; d >= 0; d--) {
        const key = dateKeyDaysAgo(d);
        const day = await db.nutritionDays.where('date').equals(key).first();
        pts.push({
          date: key.slice(5),
          protein: day ? Math.round((day.protein / target) * 100) : 0,
        });
      }
      setWeek(pts);
    })();
  }, [reloadToken]);

  return (
    <div className="panel">
      <h3>Аналитика</h3>
      <p className="muted">Streak и Consistency — в сводке выше.</p>
      <h4>Белок % от цели (7d)</h4>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {week.map((w) => (
          <div key={w.date} style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                height: `${Math.min(100, w.protein)}%`,
                background: 'var(--accent)',
                minHeight: 2,
              }}
            />
            <span style={{ fontSize: '0.7rem' }}>{w.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
