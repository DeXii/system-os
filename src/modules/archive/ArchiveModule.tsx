import { ArchiveOpsSummary } from './components/ArchiveOpsSummary';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ExportImportPanel } from './components/ExportImportPanel';
import { GroqSettingsPanel } from './components/GroqSettingsPanel';
import { InsightsHistoryPanel } from './components/InsightsHistoryPanel';

interface Props {
  onRefresh?: () => void;
  onOpenDirector?: () => void;
}

export function ArchiveModule({ onRefresh, onOpenDirector }: Props) {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--mono)', marginBottom: '0.5rem' }}>ARCHIVE</h1>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: '1rem' }}>
        Системный слой OS: облако Firebase, Groq / DIRECTOR, резервное копирование и архив
        insights.
      </p>

      <ArchiveOpsSummary />
      <CloudSyncPanel />
      <GroqSettingsPanel onOpenDirector={onOpenDirector} />
      <ExportImportPanel onRefresh={onRefresh} />
      <InsightsHistoryPanel onApplied={onRefresh} />
    </div>
  );
}
