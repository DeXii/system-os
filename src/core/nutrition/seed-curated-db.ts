import { db } from '@/core/db';
import { CURATED_INGREDIENTS, CURATED_DISHES } from '@/content/nutrition/ayanokoji';

export const CATALOG_VERSION = 2;
const VERSION_KEY = 'ayanakoji_nutrition_catalog_version';

let seeded = false;

function needsReseed(): boolean {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    return stored !== String(CATALOG_VERSION);
  } catch {
    return true;
  }
}

function markSeeded(): void {
  try {
    localStorage.setItem(VERSION_KEY, String(CATALOG_VERSION));
  } catch {
    /* ignore */
  }
}

export async function seedCuratedNutritionDb(force = false): Promise<{ ingredients: number; dishes: number }> {
  const versionBump = needsReseed();
  const shouldForce = force || versionBump;

  if (seeded && !shouldForce) {
    const ic = await db.ingredients.count();
    const dc = await db.dishes.count();
    if (ic > 0 && dc > 0) return { ingredients: ic, dishes: dc };
  }

  const existingIng = await db.ingredients.count();
  const existingDish = await db.dishes.count();

  if (existingIng === 0 || shouldForce) {
    await db.ingredients.bulkPut(CURATED_INGREDIENTS);
  }

  if (existingDish === 0 || shouldForce) {
    await db.dishes.bulkPut(CURATED_DISHES);
  }

  markSeeded();
  seeded = true;
  return {
    ingredients: await db.ingredients.count(),
    dishes: await db.dishes.count(),
  };
}
