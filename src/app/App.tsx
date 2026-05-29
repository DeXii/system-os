import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { db } from '@/core/db';
import { attachRevisionHooks, detachRevisionHooks } from '@/core/db/revision-hooks';
import {
  attachCloudSyncListeners,
  clearStaleCloudSyncError,
  detachCloudSyncListeners,
  MSG_CLOUD_EMPTY,
  MSG_LOCAL_EMPTY,
  pullFromCloud,
  pushToCloud,
} from '@/core/sync/cloud-sync';
import { AuthGate } from '@/shell/AuthGate';
import { BootScreen } from '@/shell/BootScreen';
import { Onboarding } from '@/shell/Onboarding';
import { ErrorBoundary } from './ErrorBoundary';
import { resetLocalDatabaseOnly } from '@/core/data/factory-reset';
import { OsLayout } from './OsLayout';

type Phase = 'boot' | 'onboarding' | 'os';

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
        clearStaleCloudSyncError();
        await db.open();
        const pull = await pullFromCloud();
        if (!cancelled && !pull.ok) {
          setSyncNote(`Облако: ${pull.error}. Работа с локальным кэшем.`);
        } else if (!cancelled && pull.ok && !pull.hadData) {
          if (pull.cloudEmpty) {
            const push = await pushToCloud();
            if (!push.ok) {
              setSyncNote(MSG_CLOUD_EMPTY);
            }
          } else {
            const push = await pushToCloud();
            if (!push.ok) {
              setSyncNote(push.error === MSG_LOCAL_EMPTY ? MSG_LOCAL_EMPTY : `Облако: ${push.error ?? 'не удалось сохранить'}.`);
            }
          }
        }
        attachRevisionHooks();
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
      detachRevisionHooks();
      detachCloudSyncListeners();
    };
  }, [user.uid]);

  const finishBoot = useCallback(() => {
    if (onboarded === null) return;
    setPhase(onboarded ? 'os' : 'onboarding');
  }, [onboarded]);

  if (dbError) {
    return <DbErrorScreen message={dbError} onReset={() => void resetLocalDatabaseOnly()} />;
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
