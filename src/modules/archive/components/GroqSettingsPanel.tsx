import { useState } from 'react';
import {
  getDirectorConfig,
  resetDirectorProxyToBuild,
  setDirectorConfig,
  testDirectorConnection,
  testProxyHealth,
  usesServerGroqKey,
} from '@/core/ai/director-service';
import { useDirectorStatus } from '@/hooks/useDirectorStatus';
import { GlossaryZone } from '@/ui/glossary';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

interface Props {
  onOpenDirector?: () => void;
}

export function GroqSettingsPanel({ onOpenDirector }: Props) {
  const [cfg, setCfg] = useState(getDirectorConfig);
  const [testMsg, setTestMsg] = useState('');
  const [healthMsg, setHealthMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testingHealth, setTestingHealth] = useState(false);
  const status = useDirectorStatus();
  const serverKey = usesServerGroqKey();

  const builtInProxy = (import.meta.env.VITE_GROQ_PROXY_URL || '').trim().replace(/\/$/, '');

  const saveCfg = () => {
    setDirectorConfig(cfg);
    setTestMsg('Настройки сохранены');
  };

  const resetProxyUrl = () => {
    const next = resetDirectorProxyToBuild();
    setCfg(next);
    setHealthMsg('');
    setTestMsg(
      builtInProxy
        ? `URL proxy сброшен к сборке: ${builtInProxy}`
        : 'localStorage очищен; укажите Proxy URL вручную или задайте VITE_GROQ_PROXY_URL при сборке.'
    );
  };

  const testHealth = async () => {
    setTestingHealth(true);
    setDirectorConfig(cfg);
    const r = await testProxyHealth(cfg);
    setHealthMsg(r.ok ? `Worker: ${r.message}` : `Worker: ${r.message}`);
    setTestingHealth(false);
  };

  const test = async () => {
    setTesting(true);
    setDirectorConfig(cfg);
    const r = await testDirectorConnection();
    setTestMsg(r.ok ? `OK: ${r.message}` : `Ошибка: ${r.message}`);
    setTesting(false);
  };

  const healthUrl = cfg.proxyUrl ? `${cfg.proxyUrl.replace(/\/$/, '')}/health` : '';

  return (
    <div className="panel">
      <div className="panel-title">Groq / DIRECTOR Settings</div>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          Статус DIRECTOR: {status.toUpperCase()}.
          {serverKey
            ? ' API key хранится на Cloudflare Worker — в браузере не нужен.'
            : ' Локальный режим: укажите API Key и Proxy URL.'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          console.groq.com без VPN может показывать 403 Forbidden — это нормально для РФ.
          Ключ создавайте через VPN; DIRECTOR обращается к Groq через worker (Cloudflare), не с
          вашего IP.
        </p>
      </GlossaryZone>
      {!serverKey && (
        <div className="form-row">
          <label className="label">API Key</label>
          <input
            className="input"
            type="password"
            value={cfg.apiKey}
            onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
            autoComplete="off"
          />
        </div>
      )}
      <div className="form-row">
        <label className="label">Proxy URL</label>
        <input
          className="input"
          value={cfg.proxyUrl}
          onChange={(e) => setCfg({ ...cfg, proxyUrl: e.target.value })}
          placeholder="https://ayanakoji-groq-proxy.dexi.workers.dev"
        />
        {builtInProxy && cfg.proxyUrl !== builtInProxy && (
          <p style={{ fontSize: 10, color: 'var(--warn, #c9a227)', marginTop: 4 }}>
            В localStorage другой URL, чем в сборке ({builtInProxy}). Нажмите «Сбросить URL proxy».
          </p>
        )}
        {healthUrl && (
          <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
            Health:{' '}
            <a href={healthUrl} target="_blank" rel="noreferrer">
              {healthUrl}
            </a>
            {' '}
            — ожидается {`{"ok":true,"hasGroqKey":true}`}, не ответ Groq unknown_url.
          </p>
        )}
      </div>
      {serverKey && (
        <div className="form-row">
          <label className="label">Proxy token (опционально)</label>
          <input
            className="input"
            type="password"
            value={cfg.proxyToken ?? ''}
            onChange={(e) => setCfg({ ...cfg, proxyToken: e.target.value })}
            placeholder="X-Ayanakoji-Token"
            autoComplete="off"
          />
        </div>
      )}
      <div className="form-row">
        <label className="label">Model</label>
        <input
          className="input"
          value={cfg.model}
          onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
          placeholder={DEFAULT_MODEL}
        />
        <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
          При таймаутах попробуйте llama-3.1-8b-instant (быстрее на Free worker).
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={saveCfg}>
          Сохранить
        </button>
        <button type="button" className="btn btn-sm" onClick={resetProxyUrl}>
          Сбросить URL proxy
        </button>
        <button type="button" className="btn" disabled={testingHealth} onClick={() => void testHealth()}>
          Проверить proxy (health)
        </button>
        <button type="button" className="btn" disabled={testing} onClick={() => void test()}>
          Проверить связь (Groq)
        </button>
        {onOpenDirector && (
          <button type="button" className="btn btn-sm" onClick={onOpenDirector}>
            Открыть DIRECTOR
          </button>
        )}
      </div>
      {healthMsg && <p style={{ marginTop: 8, fontSize: 12 }}>{healthMsg}</p>}
      {testMsg && <p style={{ marginTop: 8, fontSize: 12 }}>{testMsg}</p>}
    </div>
  );
}
