import { ArchiveOpsSummary } from './components/ArchiveOpsSummary';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { ExportImportPanel } from './components/ExportImportPanel';
import { GroqSettingsPanel } from './components/GroqSettingsPanel';
import { InsightsHistoryPanel } from './components/InsightsHistoryPanel';
import { DomainEventsPanel } from './components/DomainEventsPanel';
import { ModuleShell } from '@/ui/shell/ModuleShell';

interface Props {
  onRefresh?: () => void;
  onOpenDirector?: () => void;
}

export function ArchiveModule({ onRefresh, onOpenDirector }: Props) {
  return (
    <div>
      <ModuleShell title="ARCHIVE" subtitle="SYNC · GROQ · BACKUP" />

      <ArchiveOpsSummary />
      <CloudSyncPanel />
      <GroqSettingsPanel onOpenDirector={onOpenDirector} />
      <ExportImportPanel onRefresh={onRefresh} />
      <InsightsHistoryPanel onApplied={onRefresh} />
      <DomainEventsPanel />
    </div>
  );
}
