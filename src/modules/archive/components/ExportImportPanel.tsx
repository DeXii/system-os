import { useCallback, useEffect, useState } from 'react';
import {
  EXPORT_VERSION,
  exportAllData,
  getDataSnapshotStats,
  importAllData,
  validateImportPayload,
  downloadExportJson,
} from '@/core/data/export-import';
import { emitKernel, emitOsRefresh } from '@/core/events/event-bus';
import { GlossaryZone } from '@/ui/glossary';

interface Props {
  onRefresh?: () => void;
}

export function ExportImportPanel({ onRefresh }: Props) {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const loadStats = useCallback(async () => {
    setStats(await getDataSnapshotStats());
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleExport = async () => {
    setBusy(true);
    setMsg('');
    try {
      const json = await exportAllData();
      downloadExportJson(json);
      setMsg('Экспорт завершён');
      await loadStats();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ошибка экспорта');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setMsg('Некорректный JSON');
        return;
      }

      const valid = validateImportPayload(parsed);
      if (!valid.ok) {
        setMsg(valid.error);
        return;
      }

      const versionNote =
        valid.version < EXPORT_VERSION
          ? `\nВерсия файла: ${valid.version} (текущая: ${EXPORT_VERSION}).`
          : '';

      if (
        !window.confirm(
          `Импорт полностью заменит все данные OS (локальный кэш и облако).${versionNote}\n\nПродолжить?`
        )
      ) {
        return;
      }

      setBusy(true);
      setMsg('');
      try {
        await importAllData(text);
        emitOsRefresh();
        onRefresh?.();
        await emitKernel('archive', 'Импорт данных завершён', 'success');
        await loadStats();
        setMsg('Импорт завершён. OS обновлён.');
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Ошибка импорта');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const nonEmpty = stats
    ? Object.entries(stats).filter(([, n]) => n > 0)
    : [];

  return (
    <div className="panel">
      <div className="panel-title">Export / Import</div>
      <GlossaryZone>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          Export — резервная копия OS; import восстанавливает данные и синхронизирует с Firebase.
        </p>
      </GlossaryZone>
      {stats && (
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--mono)',
            maxHeight: 120,
            overflow: 'auto',
            marginBottom: 12,
          }}
        >
          {nonEmpty.length === 0 ? (
            <span style={{ color: 'var(--text-dim)' }}>База пуста</span>
          ) : (
            nonEmpty.map(([k, n]) => (
              <div key={k}>
                {k}: {n}
              </div>
            ))
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn" disabled={busy} onClick={() => void handleExport()}>
          Экспорт JSON
        </button>
        <button type="button" className="btn" disabled={busy} onClick={handleImport}>
          Импорт JSON
        </button>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void loadStats()}>
          Обновить счётчики
        </button>
      </div>
      {msg && <p style={{ marginTop: 8, fontSize: 12 }}>{msg}</p>}
    </div>
  );
}
