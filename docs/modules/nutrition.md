# NUTRITION Module

Dock tab `nutrition` — питание, meal plans, shopping list, curated DB.

## Data ownership

| Table | Purpose |
|-------|---------|
| `ingredients`, `dishes` | Curated catalog (seed on first open) |
| `nutritionGoals`, `operatorBodyMetrics` | Targets |
| `nutritionPlanState` | Active meal plan |
| `nutritionDays`, `mealEntries` | Daily tracking |
| `shoppingLists` | Generated shopping lists |

Export version **11** includes nutrition tables.

## Kernel

- `afterMealLogged` → aggregate day → `dailyLogs.nutritionOk`
- `afterRecoveryOpsSaved` → foundation.recovery slot
- `afterShoppingListGenerated`

## Task keys

- `nutrition.log`, `nutrition.plan`, `nutrition.review`

## Seed

In-app: `seedCuratedNutritionDb()`. Build script: `npx tsx scripts/nutrition-seed.ts` → `src/content/nutrition/generated/curated-bundle.json`.
