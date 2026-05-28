import { useState } from 'react';
import { DEFAULT_DOCTRINE_RULES } from '@/content/doctrine-defaults';
import { db, todayKey } from '@/core/db';
import { saveDoctrine } from '@/core/engines/doctrine-service';
import { emitKernel } from '@/core/events/event-bus';
import type { OperatorProfile } from '@/core/domain/types';

interface Props {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: Props) {
  const [codename, setCodename] = useState('');
  const [goals, setGoals] = useState('');

  const submit = async () => {
    if (!codename.trim()) return;
    const profile: OperatorProfile = {
      id: 'operator-1',
      codename: codename.trim(),
      goals: goals.trim(),
      startDate: todayKey(),
      currentStage: 'foundation',
      unlockedStages: ['foundation'],
      ethicsAccepted: true,
      onboarded: true,
      createdAt: new Date().toISOString(),
    };
    await db.operator.put(profile);
    await saveDoctrine([...DEFAULT_DOCTRINE_RULES].slice(0, 3));
    await emitKernel('command', `Оператор ${profile.codename} зарегистрирован`, 'success');
    onComplete();
  };

  return (
    <div className="boot-screen" style={{ padding: '2rem' }}>
      <div className="boot-logo" style={{ marginBottom: '1rem' }}>
        КАЛИБРОВКА ОПЕРАТОРА
      </div>
      <div className="panel" style={{ width: 'min(420px, 100%)' }}>
        <div className="form-row">
          <label className="label">Позывной</label>
          <input
            className="input"
            value={codename}
            onChange={(e) => setCodename(e.target.value)}
            placeholder="Operator"
          />
        </div>
        <div className="form-row">
          <label className="label">Цели развития</label>
          <textarea
            className="textarea"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="Что вы строите через эту систему?"
          />
        </div>
        <p className="kernel-line" style={{ marginBottom: '0.75rem' }}>
          Старт всегда с <strong>этапа 1 (FOUNDATION)</strong>. Переход на следующие этапы — через
          gate в INTEGRATION после выполнения критериев.
        </p>
        <p className="kernel-line" style={{ marginBottom: '1rem' }}>
          Активирую тактическую OS: дисциплина, расчёт, маска, многоходовые операции.
        </p>
        <button type="button" className="btn btn-primary btn-block" onClick={submit}>
          Активировать систему
        </button>
      </div>
    </div>
  );
}
