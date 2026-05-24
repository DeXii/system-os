import { useState } from 'react';
import {
  getDirectorConfig,
  getDirectorStatus,
  setDirectorConfig,
  testDirectorConnection,
  usesServerGroqKey,
} from '@/core/ai/director-service';
import { GlossaryZone } from '@/ui/glossary';

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

interface Props {
  onOpenDirector?: () => void;
}

export function GroqSettingsPanel({ onOpenDirector }: Props) {
  const [cfg, setCfg] = useState(getDirectorConfig);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const status = getDirectorStatus();
  const serverKey = usesServerGroqKey();

  const saveCfg = () => {
    setDirectorConfig(cfg);
    setTestMsg('Настройки сохранены');
  };

  const test = async () => {
    setTesting(true);
    setDirectorConfig(cfg);
    const r = await testDirectorConnection();
    setTestMsg(r.ok ? `OK: ${r.message}` : `Ошибка: ${r.message}`);
    setTesting(false);
  };

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
          placeholder="https://your-worker.workers.dev"
        />
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
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={saveCfg}>
          Сохранить
        </button>
        <button type="button" className="btn" disabled={testing} onClick={() => void test()}>
          Проверить связь
        </button>
        {onOpenDirector && (
          <button type="button" className="btn btn-sm" onClick={onOpenDirector}>
            Открыть DIRECTOR
          </button>
        )}
      </div>
      {testMsg && <p style={{ marginTop: 8, fontSize: 12 }}>{testMsg}</p>}
    </div>
  );
}
