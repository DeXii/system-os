import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/shell/TopBar';
import { Dock } from '@/shell/Dock';
import { KernelLog } from '@/shell/KernelLog';
import { CommandPalette, useCommandPaletteNavigation } from '@/shell/CommandPalette';
import { DirectorPanel } from '@/modules/director/DirectorPanel';
import { CommandModule } from '@/modules/command/CommandModule';
import { FoundationModule } from '@/modules/foundation/FoundationModule';
import { NutritionModule } from '@/modules/nutrition/NutritionModule';
import { RegulationModule } from '@/modules/regulation/RegulationModule';
import { MindModule } from '@/modules/mind/MindModule';
import { LibraryModule } from '@/modules/library/LibraryModule';
import { InfluenceModule } from '@/modules/influence/InfluenceModule';
import { IntegrationModule } from '@/modules/integration/IntegrationModule';
import { DirectorModule } from '@/modules/director/DirectorModule';
import { ArchiveModule } from '@/modules/archive/ArchiveModule';
import { PromptModule } from '@/modules/prompt/PromptModule';
import { useOsState } from '@/hooks/useOsState';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { runDirectorTask } from '@/core/ai/director-service';
import { downloadExportJson, exportAllData } from '@/core/data/export-import';
import type { ModuleId } from '@/core/domain/types';
import { GlossaryProvider } from '@/ui/glossary';

export function OsLayout() {
  const { profile, readiness, moduleStatuses, events, refresh } = useOsState();
  const breakpoint = useBreakpoint();
  const [module, setModule] = useState<ModuleId>('command');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showDirector, setShowDirector] = useState(true);
  const [directorOpen, setDirectorOpen] = useState(false);
  const [kernelOpen, setKernelOpen] = useState(breakpoint !== 'mobile');

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const directorAsSheet = isMobile || isTablet;

  useEffect(() => {
    if (isMobile) {
      setKernelOpen(false);
    } else if (breakpoint === 'desktop') {
      setKernelOpen(true);
    }
  }, [breakpoint, isMobile]);

  useEffect(() => {
    if (!directorAsSheet && showDirector) {
      setDirectorOpen(true);
    }
    if (directorAsSheet && !showDirector) {
      setDirectorOpen(false);
    }
  }, [directorAsSheet, showDirector]);

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
      run: () => {
        if (directorAsSheet) {
          setDirectorOpen((s) => !s);
        } else {
          setShowDirector((s) => !s);
        }
      },
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
            onOpenNutrition={() => setModule('nutrition')}
          />
        );
      case 'nutrition':
        return (
          <NutritionModule moduleStatus={moduleStatuses.nutrition} onRefresh={refresh} />
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
      case 'prompt':
        return <PromptModule />;
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

  const layoutClass = [
    'os-layout',
    showDirector && !directorAsSheet ? 'with-director' : '',
    !kernelOpen ? 'kernel-collapsed' : '',
    isTablet ? 'os-layout--tablet' : '',
    isMobile ? 'os-layout--mobile' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const directorVisible = showDirector && (directorAsSheet ? directorOpen : true);

  const toggleDirector = () => {
    if (directorAsSheet) {
      setDirectorOpen((s) => !s);
    } else {
      setShowDirector((s) => !s);
    }
  };

  return (
    <GlossaryProvider>
      <div className={layoutClass}>
        <TopBar
          readiness={readiness}
          profile={profile}
          breakpoint={breakpoint}
          kernelOpen={kernelOpen}
          onToggleKernel={() => setKernelOpen((s) => !s)}
          directorOpen={directorVisible}
          onToggleDirector={toggleDirector}
          showDirectorToggle={showDirector}
        />
        {!isMobile && (
          <Dock
            active={module}
            statuses={moduleStatuses}
            onSelect={setModule}
            variant="sidebar"
            compact={isTablet}
          />
        )}
        <main className="viewport">{renderModule()}</main>
        {showDirector && !directorAsSheet && (
          <DirectorPanel activeModule={module} variant="sidebar" />
        )}
        {showDirector && directorAsSheet && directorOpen && (
          <>
            <div
              className="director-backdrop"
              role="presentation"
              onClick={() => setDirectorOpen(false)}
            />
            <DirectorPanel activeModule={module} variant="sheet" onClose={() => setDirectorOpen(false)} />
          </>
        )}
        <KernelLog
          events={events}
          collapsed={!kernelOpen}
          onToggle={() => setKernelOpen((s) => !s)}
        />
        {isMobile && (
          <Dock
            active={module}
            statuses={moduleStatuses}
            onSelect={setModule}
            variant="bottom"
          />
        )}
      </div>
      {showDirector && isMobile && !directorOpen && (
        <button type="button" className="director-fab" onClick={() => setDirectorOpen(true)}>
          DIR
        </button>
      )}
      <CommandPalette
        open={paletteOpen}
        actions={paletteActions}
        onClose={() => setPaletteOpen(false)}
      />
    </GlossaryProvider>
  );
}
