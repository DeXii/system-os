import { useCallback, useState } from 'react';
import { useAsyncEffect } from '@/hooks/useAsyncEffect';
import { getNutritionStreak, getConsistencyScore } from '@/core/engines/nutrition-metrics';
import { getActiveGoal } from '@/core/engines/nutrition-goal-engine';

interface Props {
  reloadToken: number;
}

export function NutritionOpsSummary({ reloadToken }: Props) {
  const [streak, setStreak] = useState(0);
  const [consistency, setConsistency] = useState(0);
  const [goalLabel, setGoalLabel] = useState('—');

  const load = useCallback(async () => {
    setStreak(await getNutritionStreak());
    setConsistency(await getConsistencyScore());
    const g = await getActiveGoal();
    setGoalLabel(g?.goalType ?? 'не задана');
  }, []);

  useAsyncEffect(
    async (signal) => {
      await load();
      if (signal.aborted) return;
    },
    [load, reloadToken]
  );

  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <span className="muted">Streak</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{streak} дн.</div>
        </div>
        <div>
          <span className="muted">Consistency 7d</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{consistency}%</div>
        </div>
        <div>
          <span className="muted">Цель</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{goalLabel}</div>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          Обновить
        </button>
      </div>
    </div>
  );
}
