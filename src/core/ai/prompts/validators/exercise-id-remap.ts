export interface ExerciseCatalogEntry {
  id: string;
  name?: string;
  pattern?: string;
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_а-яё]/gi, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur =
        a[i] === b[j]
          ? row[j]
          : Math.min(row[j] + 1, row[j + 1] + 1, prev + 1);
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

const ALIAS_TO_ID: Record<string, string> = {
  pullup: 'hift_pullup',
  pull_up: 'hift_pullup',
  pull_ups: 'hift_pullup',
  подтягивания: 'hift_pullup',
  dip: 'hift_dip',
  dips: 'hift_dip',
  дип: 'hift_dip',
  брусья: 'hift_dip',
  australian: 'hift_australian',
  pushup: 'hift_pushup',
  push_up: 'hift_pushup',
  knee_raise: 'hift_knee_raise',
  plank: 'hift_plank',
};

/**
 * Maps a model-provided exerciseId to an allowed catalog id when possible.
 */
export function remapExerciseId(
  rawId: string,
  allowedIds: string[],
  catalog?: ExerciseCatalogEntry[]
): string | null {
  if (!rawId?.trim() || !allowedIds.length) return null;
  const allowed = new Set(allowedIds);
  if (allowed.has(rawId)) return rawId;

  const norm = normalizeKey(rawId);
  if (ALIAS_TO_ID[norm] && allowed.has(ALIAS_TO_ID[norm])) return ALIAS_TO_ID[norm];

  const entries = (catalog ?? []).filter((e) => allowed.has(e.id));
  for (const e of entries) {
    if (normalizeKey(e.id) === norm) return e.id;
  }

  for (const id of allowedIds) {
    const idNorm = normalizeKey(id);
    if (idNorm === norm || idNorm.includes(norm) || norm.includes(idNorm)) return id;
  }

  if (entries.length) {
    for (const e of entries) {
      if (e.name && normalizeKey(e.name) === norm) return e.id;
      if (e.name && normalizeKey(e.name).includes(norm)) return e.id;
      if (e.name && norm.includes(normalizeKey(e.name))) return e.id;
    }

    let best: { id: string; dist: number } | null = null;
    for (const e of entries) {
      const candidates = [normalizeKey(e.id), e.name ? normalizeKey(e.name) : ''].filter(Boolean);
      for (const c of candidates) {
        const dist = levenshtein(norm, c);
        if (dist <= 3 && (!best || dist < best.dist)) best = { id: e.id, dist };
      }
    }
    if (best) return best.id;
  }

  return null;
}

export function remapWorkoutPlanExerciseIds(
  exercises: { exerciseId?: string }[],
  allowedIds: string[] | undefined,
  catalog?: ExerciseCatalogEntry[]
): { exercises: { exerciseId?: string }[]; remapped: string[] } {
  if (!allowedIds?.length) return { exercises, remapped: [] };
  const remapped: string[] = [];
  const next = exercises.map((ex) => {
    const id = ex.exerciseId;
    if (!id || exerciseIdAllowedLocal(id, allowedIds)) return ex;
    const mapped = remapExerciseId(id, allowedIds, catalog);
    if (mapped && mapped !== id) {
      remapped.push(`${id}→${mapped}`);
      return { ...ex, exerciseId: mapped };
    }
    return ex;
  });
  return { exercises: next, remapped };
}

function exerciseIdAllowedLocal(id: string, allowedIds: string[]): boolean {
  return allowedIds.includes(id);
}
