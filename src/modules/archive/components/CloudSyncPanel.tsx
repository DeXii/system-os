import { useEffect, useState } from 'react';
import {
  getCloudSyncStatus,
  getLastRemoteUpdatedAt,
  pushToCloud,
  pullFromCloud,
  subscribeCloudSync,
} from '@/core/sync/cloud-sync';
import { signOutUser } from '@/core/firebase/auth';
import { GlossaryZone } from '@/ui/glossary';

const STATUS_LABEL: Record<string, string> = {
  idle: 'Ожидание',
  syncing: 'Сохранение…',
  synced: 'Синхронизировано',
  error: 'Ошибка',
};

export function CloudSyncPanel() {
  const [, tick] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeCloudSync(() => tick((n) => n + 1)), []);

  const { status, error } = getCloudSyncStatus();
  const remoteAt = getLastRemoteUpdatedAt();

  const syncNow = async () => {
    setBusy(true);
    setMsg('');
    const pull = await pullFromCloud();
    if (!pull.ok) {
      setMsg(pull.error);
      setBusy(false);
      return;
    }
    const push = await pushToCloud();
    setMsg(push.ok ? 'Синхронизация завершена' : (push.error ?? 'Ошибка'));
    setBusy(false);
  };

  return (
    <div className="panel">
      <div className="panel-title">Облако (Firebase)</div>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          Данные OS хранятся в Firestore и кэшируются локально в IndexedDB. Изменения
          автоматически отправляются в облако.
        </p>
      </GlossaryZone>
      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 8 }}>
        Статус: {STATUS_LABEL[status] ?? status}
        {error && <span style={{ color: 'var(--danger, #e55)' }}> — {error}</span>}
      </div>
      {remoteAt && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Последнее облако: {remoteAt}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void syncNow()}>
          Синхронизировать сейчас
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void signOutUser().then(() => window.location.reload())}
        >
          Выйти
        </button>
      </div>
      {msg && <p style={{ marginTop: 8, fontSize: 12 }}>{msg}</p>}
    </div>
  );
}
