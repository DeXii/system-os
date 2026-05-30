# NUTRITION Module

Dock tab `nutrition` — питание, meal plans, shopping list, curated DB. **Не** пятый этап пирамиды readiness.

## Компоненты

| Компонент | Назначение |
|-----------|------------|
| `NutritionDashboard` | Обзор дня / недели |
| `NutritionOpsSummary` | Сводка 7d + `buildNutritionDirective()` |
| `NutritionGoalPanel` | Цели kcal / macros |
| `BodyMetricsPanel` | Вес и метрики тела |
| `MealBuilderPanel` / `MealCompositionBlock` | Сборка приёма пищи |
| `MealPlanPanel` | Активный план |
| `IngredientLibraryPanel` / `DishLibraryPanel` | Каталог |
| `ShoppingListPanel` | Списки покупок |
| `NutritionAnalyticsPanel` | Аналитика adherence |
| `NutritionDirectorPanel` | nutrition coach + apply actions |

## Data ownership

| Table | Purpose |
|-------|---------|
| `ingredients`, `dishes` | Curated catalog (seed on first open) |
| `customIngredients`, `customDishes` | Пользовательские позиции |
| `nutritionGoals`, `operatorBodyMetrics` | Targets / body log |
| `nutritionPlanState` | Active meal plan |
| `nutritionDays`, `mealEntries` | Daily tracking |
| `shoppingLists` | Generated shopping lists |
| `operatorNutritionParams` | Adaptive layer (STATE) |

Export version **17** includes all nutrition tables and `operatorNutritionParams`.

## taskKey

- `nutrition.log` — дневной лог приёмов пищи
- `nutrition.plan` — применение / обновление плана
- `nutrition.review` — воскресный обзор (авто при 4+ днях лога)

## Kernel

- `afterNutritionGoalSet` — сохранение целей
- `afterMealLogged` → aggregate day → `updateNutritionParamsFromDay` → `dailyLogs.nutritionOk`
- `afterNutritionPlanUpdated` → completes `nutrition.plan`
- `afterMealLogged` (Sunday, 4+ logged days) → may complete `nutrition.review`
- `afterShoppingListGenerated`
- `afterRecoveryOpsSaved` → может завершить `foundation.recovery` (recovery ops из FOUNDATION)

## Adaptive layer

- `nutrition-metrics.ts` — `getNutritionOpsSummary()`
- `nutrition-thresholds.ts`, `nutrition-params.ts` (`operatorNutritionParams`)
- `buildNutritionDirective()` — `[РАСЧЁТ] · [ДЕЙСТВИЕ] · [ОТКАЗ]` в OpsSummary и DIRECTOR (`nutrition.nutritionDirective`)

## DIRECTOR

Задачи nutrition scope в `director-tasks.ts` / `task-registry.ts`. Context slices — `context-manifest.ts` (nutrition.* paths).

## Seed

In-app: `seedCuratedNutritionDb()`. Build script: `npx tsx scripts/nutrition-seed.ts` → `src/content/nutrition/generated/curated-bundle.json`.
