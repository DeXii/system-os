import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { signIn, subscribeAuth } from '@/core/firebase/auth';
import { getFirebaseConfigError, isFirebaseConfigured } from '@/core/firebase/config';

interface Props {
  children: (user: User) => ReactNode;
}

function ConfigMissingScreen() {
  const err = getFirebaseConfigError();
  return (
    <div className="boot-screen" style={{ padding: '2rem', maxWidth: 520 }}>
      <div className="boot-logo" style={{ marginBottom: '1rem' }}>
        КОНФИГУРАЦИЯ FIREBASE
      </div>
      <p style={{ fontSize: 13, marginBottom: '1rem' }}>{err}</p>
      <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        Скопируйте <code>.env.example</code> в <code>.env</code> для локальной разработки или
        задайте secrets в GitHub Actions. Инструкция: <code>docs/DEPLOY.md</code>.
      </p>
    </div>
  );
}

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      return;
    }
    return subscribeAuth((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  if (!isFirebaseConfigured()) {
    return <ConfigMissingScreen />;
  }

  if (!ready) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">AYANAKOJI</div>
        <div className="boot-line">&gt; Firebase Auth...</div>
      </div>
    );
  }

  if (user) {
    return <>{children(user)}</>;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="boot-screen" style={{ padding: '2rem', maxWidth: 400 }}>
      <div className="boot-logo" style={{ marginBottom: '1.5rem' }}>
        AYANAKOJI OS
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: '1rem' }}>
        Вход в персональную OS. Данные синхронизируются с Firebase.
      </p>
      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="form-row">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="form-row">
          <label className="label">Пароль</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--danger, #e55)', marginBottom: 8 }}>{error}</p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
