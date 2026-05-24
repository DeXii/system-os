import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/shell/TopBar';
import { Dock } from '@/shell/Dock';
import { KernelLog } from '@/shell/KernelLog';
import { CommandPalette, useCommandPaletteNavigation } from '@/shell/CommandPalette';
import { DirectorPanel } from '@/modules/director/DirectorPanel';
import { CommandModule } from '@/modules/command/CommandModule';
import { FoundationModule } from '@/modules/foundation/FoundationModule';
import { RegulationModule } from '@/modules/regulation/RegulationModule';
import { MindModule } from '@/modules/mind/MindModule';
import { LibraryModule } from '@/modules/library/LibraryModule';
import { InfluenceModule } from '@/modules/influence/InfluenceModule';
import { IntegrationModule } from '@/modules/integration/IntegrationModule';
import { DirectorModule } from '@/modules/director/DirectorModule';
import { ArchiveModule } from '@/modules/archive/ArchiveModule';
import { useOsState } from '@/hooks/useOsState';
import { runDirectorTask } from '@/core/ai/director-service';
import { downloadExportJson, exportAllData } from '@/core/data/export-import';
import type { ModuleId } from '@/core/domain/types';
import { GlossaryProvider } from '@/ui/glossary';

export function OsLayout() {
  const { profile, readiness, moduleStatuses, events, refresh } = useOsState();
  const [module, setModule] = useState<ModuleId>('command');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showDirector, setShowDirector] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paletteActions = useCommandPaletteNavigation(setModule, [
    {
      id: 'briefing',
      label: 'DIRECTOR: Утренний briefing',
      run: () => runDirectorTask('morningBriefing', { scope: 'command' }),
    },
    {
      id: 'debrief',
      label: 'DIRECTOR: Вечерний debrief',
      run: () => runDirectorTask('eveningDebrief', { scope: 'command' }),
    },
    {
      id: 'toggle-dir',
      label: 'Переключить панель DIRECTOR',
      run: () => setShowDirector((s) => !s),
    },
    {
      id: 'archive-export',
      label: 'ARCHIVE: Экспорт данных',
      run: () => {
        void exportAllData().then(downloadExportJson);
      },
    },
  ]);

  const renderModule = useCallback(() => {
    switch (module) {
      case 'command':
        return (
          <CommandModule
            profile={profile}
            readiness={readiness}
            onRefresh={refresh}
            onOpenIntegration={() => setModule('integration')}
          />
        );
      case 'foundation':
        return (
          <FoundationModule
            moduleStatus={moduleStatuses.foundation}
            onRefresh={refresh}
            onOpenLibrary={() => setModule('library')}
          />
        );
      case 'regulation':
        return (
          <RegulationModule
            moduleStatus={moduleStatuses.regulation}
            onRefresh={refresh}
            onOpenLibrary={() => setModule('library')}
          />
        );
      case 'mind':
        return (
          <MindModule
            moduleStatus={moduleStatuses.mind}
            onRefresh={refresh}
            onOpenLibrary={() => setModule('library')}
          />
        );
      case 'influence':
        return (
          <InfluenceModule
            moduleStatus={moduleStatuses.influence}
            onRefresh={refresh}
            onOpenLibrary={() => setModule('library')}
          />
        );
      case 'library':
        return <LibraryModule onRefresh={refresh} />;
      case 'integration':
        return (
          <IntegrationModule
            profile={profile}
            readiness={readiness}
            onRefresh={refresh}
            onNavigateModule={setModule}
          />
        );
      case 'director':
        return <DirectorModule onOpenArchive={() => setModule('archive')} />;
      case 'archive':
        return (
          <ArchiveModule
            onRefresh={refresh}
            onOpenDirector={() => setModule('director')}
          />
        );
      default:
        return null;
    }
  }, [module, profile, readiness, moduleStatuses, refresh]);

  return (
    <GlossaryProvider>
      <div className={`os-layout ${showDirector ? 'with-director' : ''}`}>
        <TopBar readiness={readiness} profile={profile} />
        <Dock active={module} statuses={moduleStatuses} onSelect={setModule} />
        <main className="viewport">{renderModule()}</main>
        {showDirector && <DirectorPanel activeModule={module} />}
        <KernelLog events={events} />
      </div>
      <CommandPalette
        open={paletteOpen}
        actions={paletteActions}
        onClose={() => setPaletteOpen(false)}
      />
    </GlossaryProvider>
  );
}
