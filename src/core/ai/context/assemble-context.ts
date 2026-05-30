import type { TaskId } from '../director-tasks';
import { resolveScope } from '../director-tasks';
import {
  buildFlatDirectorContext,
  splitLayeredContext,
  type ContextLookbackDays,
  type WorkoutContextOptions,
} from '../context-builder';
import { getCachedContextJson, contextCacheKey } from '../../cache/context-cache';
import { getContextManifest, resolveManifestLookback } from '../prompts/registry/context-manifest';
import { ALL_LOAD_GROUPS, loadGroupsForSlices } from './slice-groups';
import { buildLayeredPayload } from './apply-slice-filter';
import type { BuildDirectorContextOptions } from './context-slice-types';

export type { ContextLookbackDays, WorkoutContextOptions } from '../context-builder';
export { sinceForLookback, splitLayeredContext } from '../context-builder';

export async function buildDirectorContextForTask(
  taskId: TaskId,
  options?: BuildDirectorContextOptions
): Promise<string> {
  const manifest = getContextManifest(taskId);
  const lookbackDays = resolveManifestLookback(taskId, options?.lookbackDays);
  const scope = options?.scope ?? resolveScope(taskId);
  const workoutKind = options?.workoutContext?.kind;

  return getCachedContextJson(
    contextCacheKey(taskId, lookbackDays, workoutKind),
    () => buildDirectorContextForTaskUncached(taskId, { ...options, lookbackDays, scope })
  );
}

async function buildDirectorContextForTaskUncached(
  taskId: TaskId,
  options: BuildDirectorContextOptions & { lookbackDays: ContextLookbackDays; scope: string }
): Promise<string> {
  const manifest = getContextManifest(taskId);
  const lookbackDays = options.lookbackDays;
  const groups =
    manifest.mode === 'full'
      ? new Set(ALL_LOAD_GROUPS)
      : loadGroupsForSlices(manifest.slices);

  const flat = await buildFlatDirectorContext(
    groups,
    options.scope,
    lookbackDays,
    options.workoutContext
  );

  const today = flat.date as string;
  const since = flat.contextSinceDate as string;
  const layered = splitLayeredContext(flat);

  const payload = buildLayeredPayload(
    {
      date: today,
      contextLookbackDays: lookbackDays,
      contextSinceDate: since,
      scope: options.scope,
      taskId,
    },
    layered,
    manifest.slices,
    manifest.mode
  );

  return JSON.stringify(payload);
}

/** Full layered context for applyAiActions validation */
export async function buildFullDirectorContextJson(
  lookbackDays: ContextLookbackDays = 7
): Promise<string> {
  return buildDirectorContextForTask('freeCommand', {
    scope: 'full',
    lookbackDays,
  });
}
