import type { IngredientUnit } from '@/core/domain/nutrition-types';

export interface NormalizedAmount {
  amount: number;
  unit: IngredientUnit;
}

const TO_GRAMS: Partial<Record<IngredientUnit, number>> = {
  g: 1,
  kg: 1000,
};

const TO_ML: Partial<Record<IngredientUnit, number>> = {
  ml: 1,
  l: 1000,
  tbsp: 15,
  tsp: 5,
};

export function normalizeAmount(
  amount: number,
  unit: IngredientUnit
): NormalizedAmount | null {
  if (unit in TO_GRAMS) {
    return { amount: amount * (TO_GRAMS[unit] ?? 1), unit: 'g' };
  }
  if (unit in TO_ML) {
    return { amount: amount * (TO_ML[unit] ?? 1), unit: 'ml' };
  }
  if (unit === 'pcs') {
    return { amount, unit: 'pcs' };
  }
  return null;
}

export function canMergeUnits(a: IngredientUnit, b: IngredientUnit): boolean {
  const ga = a in TO_GRAMS || a === 'g' || a === 'kg';
  const gb = b in TO_GRAMS || b === 'g' || b === 'kg';
  if (ga && gb) return true;
  const ma = a in TO_ML || a === 'ml' || a === 'l';
  const mb = b in TO_ML || b === 'ml' || b === 'l';
  if (ma && mb) return true;
  return a === 'pcs' && b === 'pcs';
}
