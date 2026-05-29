import { invalidateDerivedCaches } from '../cache/invalidate';
import { bumpGlobalRevision } from './write';
import { db } from './index';

let revisionHookUnsub: (() => void) | null = null;
let bumpTimer: ReturnType<typeof setTimeout> | null = null;
let bumpInFlight: Promise<void> | null = null;

const DEBOUNCE_MS = 50;

async function flushRevisionBump(): Promise<void> {
  if (bumpInFlight) return bumpInFlight;
  bumpInFlight = (async () => {
    await bumpGlobalRevision();
    invalidateDerivedCaches('db_mutation');
  })().finally(() => {
    bumpInFlight = null;
  });
  return bumpInFlight;
}

function scheduleRevisionBump(): void {
  if (bumpTimer) clearTimeout(bumpTimer);
  bumpTimer = setTimeout(() => {
    bumpTimer = null;
    void flushRevisionBump();
  }, DEBOUNCE_MS);
}

/** Bumps globalRevision after Dexie writes that bypass kernel afterFactWrite. */
export function attachRevisionHooks(): () => void {
  if (revisionHookUnsub) return revisionHookUnsub;

  const onChange = () => scheduleRevisionBump();
  for (const table of db.tables) {
    table.hook('creating', onChange);
    table.hook('updating', onChange);
    table.hook('deleting', onChange);
  }

  revisionHookUnsub = () => {
    for (const table of db.tables) {
      table.hook('creating').unsubscribe(onChange);
      table.hook('updating').unsubscribe(onChange);
      table.hook('deleting').unsubscribe(onChange);
    }
    if (bumpTimer) {
      clearTimeout(bumpTimer);
      bumpTimer = null;
    }
    revisionHookUnsub = null;
  };
  return revisionHookUnsub;
}

export function detachRevisionHooks(): void {
  revisionHookUnsub?.();
}
