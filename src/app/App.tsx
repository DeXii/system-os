import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { db } from '@/core/db';
import {
  attachCloudSyncListeners,
  detachCloudSyncListeners,
  pullFromCloud,
  pushToCloud,
} from '@/core/sync/cloud-sync';
import { AuthGate } from '@/shell/AuthGate';
import { BootScreen } from '@/shell/BootScreen';
import { Onboarding } from '@/shell/Onboarding';
import { ErrorBoundary } from './ErrorBoundary';
import { OsLayout } from './OsLayout';

type Phase = 'boot' | 'onboarding' | 'os';

const DB_NAME = 'ayanakoji_os';

async function resetLocalDatabase(): Promise<void> {
  detachCloudSyncListeners();
  db.close();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  window.location.reload();
}

function DbErrorScreen({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="boot-screen" style={{ padding: '2rem', maxWidth: 520 }}>
      <div className="boot-logo" style={{ marginBottom: '1rem' }}>
        ОШИБКА БАЗЫ ДАННЫХ
      </div>
      <p style={{ fontSize: 13, marginBottom: '1rem' }}>{message}</p>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '1rem' }}>
        IndexedDB недоступна или повреждена. Сброс удалит локальный кэш на этом устройстве.
        Облачная копия в Firebase сохранится.
      </p>
      <button type="button" className="btn btn-primary" onClick={onReset}>
        Сбросить локальные данные
      </button>
    </div>
  );
}

function OsApp({ user }: { user: User }) {
  const [phase, setPhase] = useState<Phase>('boot');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await db.open();
        const pull = await pullFromCloud();
        if (!cancelled && !pull.ok) {
          setSyncNote(`Облако: ${pull.error}. Работа с локальным кэшем.`);
        } else if (!cancelled && pull.ok && !pull.hadData) {
          const push = await pushToCloud();
          if (!push.ok) {
            setSyncNote(`Облако: ${push.error ?? 'не удалось сохранить'}.`);
          }
        }
        attachCloudSyncListeners();
        const p = await db.operator.toCollection().first();
        if (!cancelled) {
          setOnboarded(!!p?.onboarded);
          setDbReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setDbError(e instanceof Error ? e.message : 'Не удалось открыть IndexedDB');
          setDbReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      detachCloudSyncListeners();
    };
  }, [user.uid]);

  const finishBoot = useCallback(() => {
    if (onboarded === null) return;
    setPhase(onboarded ? 'os' : 'onboarding');
  }, [onboarded]);

  if (dbError) {
    return <DbErrorScreen message={dbError} onReset={() => void resetLocalDatabase()} />;
  }

  if (!dbReady) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">AYANAKOJI</div>
        <div className="boot-line">&gt; Синхронизация с Firebase...</div>
        {syncNote && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>{syncNote}</p>
        )}
      </div>
    );
  }

  if (phase === 'boot') {
    return <BootScreen onComplete={finishBoot} />;
  }

  if (phase === 'onboarding') {
    return <Onboarding onComplete={() => setPhase('os')} />;
  }

  return (
    <ErrorBoundary>
      <OsLayout />
    </ErrorBoundary>
  );
}

export function App() {
  return <AuthGate>{(user) => <OsApp user={user} />}</AuthGate>;
}
