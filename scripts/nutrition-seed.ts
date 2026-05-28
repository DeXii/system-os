/**
 * Build-time: writes curated-bundle.json from in-repo catalogs.
 * Run: npx tsx scripts/nutrition-seed.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CURATED_INGREDIENTS, CURATED_DISHES } from '../src/content/nutrition/ayanokoji';

const dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(dir, '../src/content/nutrition/generated');
mkdirSync(outDir, { recursive: true });

const bundle = {
  version: 1,
  generatedAt: new Date().toISOString(),
  ingredients: CURATED_INGREDIENTS,
  dishes: CURATED_DISHES,
};

writeFileSync(join(outDir, 'curated-bundle.json'), JSON.stringify(bundle, null, 2));
console.log(`Wrote ${CURATED_INGREDIENTS.length} ingredients, ${CURATED_DISHES.length} dishes`);
