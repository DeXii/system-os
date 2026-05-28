import { useState } from 'react';
import { factoryResetOs } from '@/core/data/factory-reset';

const CONFIRM_1 =
  'Сброс удалит ВСЕ записи OS на этом устройстве и в Firebase. Это необратимо. Продолжить?';

const CONFIRM_2 =
  'Последнее предупреждение: все данные будут уничтожены, система начнётся заново с онбординга. Подтвердить сброс?';

export function SystemResetPanel() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const handleReset = async () => {
    if (!window.confirm(CONFIRM_1)) return;
    if (!window.confirm(CONFIRM_2)) return;

    setBusy(true);
    setMsg('');
    const result = await factoryResetOs();
    if (!result.ok) {
      setMsg(result.error);
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ borderColor: 'var(--danger)' }}>
      <div className="panel-title" style={{ color: 'var(--danger)' }}>
        Сброс системы
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
        Удаляются все записи OS: логи, миссии, этапы, insights, библиотека, облачный snapshot в
        Firebase. Рекомендуется сделать Export выше перед сбросом.
      </p>
      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
        Не удаляются: настройки Groq, вход в Firebase.
      </p>
      <button
        type="button"
        className="btn btn-sm"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        disabled={busy}
        onClick={() => void handleReset()}
      >
        {busy ? 'Сброс…' : 'Сбросить систему'}
      </button>
      {msg && (
        <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
