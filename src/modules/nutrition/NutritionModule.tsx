import { useCallback, useEffect, useState } from 'react';
import { TASK_KEYS } from '@/content/task-keys';
import { findSlotByTaskKey } from '@/core/engines/week-schedule';
import { getDegradedMessage } from '@/core/engines/stage-gates';
import { seedCuratedNutritionDb } from '@/core/nutrition/seed-curated-db';
import type { ModuleStatus } from '@/core/domain/types';
import { ModuleShell } from '@/ui/shell/ModuleShell';
import { NutritionDashboard } from './components/NutritionDashboard';
import { NutritionGoalPanel } from './components/NutritionGoalPanel';
import { BodyMetricsPanel } from './components/BodyMetricsPanel';
import { MealPlanPanel } from './components/MealPlanPanel';
import { ShoppingListPanel } from './components/ShoppingListPanel';
import { IngredientLibraryPanel } from './components/IngredientLibraryPanel';
import { DishLibraryPanel } from './components/DishLibraryPanel';
import { NutritionOpsSummary } from './components/NutritionOpsSummary';
import { MealBuilderPanel } from './components/MealBuilderPanel';
import { NutritionAnalyticsPanel } from './components/NutritionAnalyticsPanel';
import { NutritionDirectorPanel } from './components/NutritionDirectorPanel';
import { useNutritionPlanDay } from './hooks/useNutritionPlanDay';

interface Props {
  moduleStatus: ModuleStatus;
  onRefresh: () => void;
}

export type NutritionTab =
  | 'dashboard'
  | 'plans'
  | 'shopping'
  | 'ingredients'
  | 'dishes'
  | 'builder'
  | 'analytics'
  | 'coach';

const TABS: { id: NutritionTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'plans', label: 'Meal Plans' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'dishes', label: 'Dishes' },
  { id: 'builder', label: 'Builder' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'coach', label: 'AI Coach' },
];

export function NutritionModule({ moduleStatus, onRefresh }: Props) {
  const [tab, setTab] = useState<NutritionTab>('dashboard');
  const [seeded, setSeeded] = useState(false);
  const [queueHint, setQueueHint] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const { planDayIndex, todayIngredientIds } = useNutritionPlanDay(version);

  const bump = useCallback(() => {
    setVersion((v) => v + 1);
    onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    void seedCuratedNutritionDb().then(() => setSeeded(true));
  }, []);

  useEffect(() => {
    void findSlotByTaskKey(TASK_KEYS.nutritionLog).then((slot) => {
      if (slot?.status === 'pending') {
        setQueueHint(`#${slot.rank} COMMAND: ${slot.title}`);
      } else {
        setQueueHint(null);
      }
    });
  }, [version]);

  const degraded = moduleStatus === 'degraded' ? getDegradedMessage('nutrition') : null;

  if (!seeded) {
    return (
      <div className="panel">
        <p className="muted">Загрузка базы питания…</p>
      </div>
    );
  }

  return (
    <div>
      <ModuleShell
        title="NUTRITION"
        subtitle="STG-1 · FUEL & RECOVERY"
        chips={degraded ? <span className="tag warn">DEGRADED</span> : undefined}
      />
      {degraded && <div className="alert-banner">{degraded}</div>}
      {queueHint && (
        <div className="alert-banner" style={{ borderColor: 'var(--accent)' }}>
          {queueHint}
        </div>
      )}

      <NutritionOpsSummary reloadToken={version} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? 'btn-primary' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <NutritionDashboard reloadToken={version} onBump={bump} planDayIndex={planDayIndex} />
      )}
      {tab === 'plans' && (
        <MealPlanPanel
          reloadToken={version}
          onBump={bump}
          onOpenShopping={() => setTab('shopping')}
          activePlanDayIndex={planDayIndex}
        />
      )}
      {tab === 'shopping' && (
        <ShoppingListPanel
          reloadToken={version}
          onBump={bump}
          todayIngredientIds={todayIngredientIds}
        />
      )}
      {tab === 'ingredients' && (
        <IngredientLibraryPanel
          highlightIds={todayIngredientIds}
          planDayIndex={planDayIndex}
        />
      )}
      {tab === 'dishes' && <DishLibraryPanel />}
      {tab === 'builder' && <MealBuilderPanel onBump={bump} />}
      {tab === 'analytics' && <NutritionAnalyticsPanel reloadToken={version} />}
      {tab === 'coach' && <NutritionDirectorPanel />}

      {(tab === 'dashboard' || tab === 'coach') && (
        <div className="grid-2" style={{ marginTop: 12 }}>
          <NutritionGoalPanel onSaved={bump} />
          <BodyMetricsPanel onSaved={bump} />
        </div>
      )}
    </div>
  );
}
