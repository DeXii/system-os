import { useCallback, useEffect, useState } from 'react';
import {
  clearStaleCloudSyncError,
  getCloudSyncStatus,
  getLastRemoteUpdatedAt,
  inspectCloudSnapshot,
  localHasOsData,
  MSG_CLOUD_EMPTY,
  MSG_LOCAL_EMPTY,
  pushToCloud,
  pullFromCloud,
  subscribeCloudSync,
  type CloudSnapshotInspect,
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
  const [localHasData, setLocalHasData] = useState<boolean | null>(null);
  const [cloudInspect, setCloudInspect] = useState<CloudSnapshotInspect | null>(null);

  const refreshDiagnostics = useCallback(async () => {
    setLocalHasData(await localHasOsData());
    setCloudInspect(await inspectCloudSnapshot());
  }, []);

  useEffect(() => {
    clearStaleCloudSyncError();
    void refreshDiagnostics();
    return subscribeCloudSync(() => {
      tick((n) => n + 1);
      void refreshDiagnostics();
    });
  }, [refreshDiagnostics]);

  const { status, error } = getCloudSyncStatus();
  const remoteAt = getLastRemoteUpdatedAt();

  const hint =
    cloudInspect?.cloudEmpty && localHasData === false
      ? MSG_CLOUD_EMPTY
      : localHasData === false
        ? MSG_LOCAL_EMPTY
        : cloudInspect?.cloudEmpty
          ? MSG_CLOUD_EMPTY
          : '';

  const statusLine =
    status === 'error' && error
      ? `${STATUS_LABEL.error} — ${error}`
      : hint && status !== 'syncing'
        ? `Подсказка — ${hint}`
        : `Статус: ${STATUS_LABEL[status] ?? status}`;

  const syncNow = async () => {
    setBusy(true);
    setMsg('');
    const pull = await pullFromCloud();
    if (!pull.ok) {
      setMsg(pull.error);
      setBusy(false);
      await refreshDiagnostics();
      return;
    }
    if (pull.cloudEmpty) {
      setMsg('В облаке пустой snapshot — загружаем локальные данные в Firebase…');
    }
    const push = await pushToCloud();
    if (push.ok) {
      setMsg(
        pull.hadData
          ? 'Синхронизация завершена (облако → устройство → облако).'
          : 'Локальные данные сохранены в облако.'
      );
    } else {
      setMsg(push.error ?? 'Ошибка');
    }
    setBusy(false);
    await refreshDiagnostics();
  };

  const pushOnly = async () => {
    setBusy(true);
    setMsg('');
    const push = await pushToCloud();
    setMsg(push.ok ? 'Данные отправлены в облако.' : (push.error ?? 'Ошибка'));
    setBusy(false);
    await refreshDiagnostics();
  };

  const cloudTablesLine =
    cloudInspect?.ok && cloudInspect.exists && !cloudInspect.cloudEmpty
      ? `Таблиц в облаке с данными: ${cloudInspect.nonEmptyTables.length}`
      : cloudInspect?.ok && cloudInspect.cloudEmpty
        ? 'В облаке нет данных OS (пустой snapshot)'
        : cloudInspect?.ok && !cloudInspect.exists
          ? 'Документ облака ещё не создан'
          : null;

  return (
    <div className="panel">
      <div className="panel-title">Облако (Firebase)</div>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          Данные OS хранятся в Firestore и кэшируются локально в IndexedDB. Изменения
          автоматически отправляются в облако.
        </p>
      </GlossaryZone>
      <div
        style={{
          fontSize: 12,
          fontFamily: 'var(--mono)',
          marginBottom: 8,
          color: status === 'error' ? 'var(--danger, #e55)' : undefined,
        }}
      >
        {statusLine}
      </div>
      {localHasData !== null && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
          Локально: {localHasData ? 'есть данные OS' : 'пусто'}
        </div>
      )}
      {cloudTablesLine && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
          {cloudTablesLine}
        </div>
      )}
      {remoteAt && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Последнее облако: {remoteAt}
        </div>
      )}
      {cloudInspect?.updatedAt && cloudInspect.updatedAt !== remoteAt && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          Проверка облака: {cloudInspect.updatedAt}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void syncNow()}>
          Синхронизировать сейчас
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void pushOnly()}>
          Только в облако
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() => void refreshDiagnostics()}
        >
          Проверить облако
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
      {hint && status !== 'error' && (
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)' }}>{hint}</p>
      )}
    </div>
  );
}
