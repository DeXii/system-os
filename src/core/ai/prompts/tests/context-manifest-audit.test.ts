import { describe, expect, it } from 'vitest';
import { DIRECTOR_TASKS } from '../../director-tasks';
import { TASK_CONTEXT_MANIFESTS } from '../registry/context-manifest';
import {
  assertManifestSlicesKnown,
  pathsForManifestSlices,
  requiredPathsForTask,
  SLICE_REQUIRED_PATHS,
} from '../registry/context-manifest-audit';

describe('context manifest audit', () => {
  it('every TaskId has a manifest', () => {
    for (const task of DIRECTOR_TASKS) {
      expect(TASK_CONTEXT_MANIFESTS[task.id]).toBeDefined();
    }
  });

  it('only freeCommand and deep analysis use full mode', () => {
    const fullTasks = DIRECTOR_TASKS.filter(
      (t) => TASK_CONTEXT_MANIFESTS[t.id].mode === 'full'
    ).map((t) => t.id);
    expect(fullTasks.sort()).toEqual(
      ['deepAnalysis14d', 'deepAnalysis30d', 'freeCommand'].sort()
    );
  });

  it('all manifest slices are registered in SLICE_REQUIRED_PATHS', () => {
    for (const task of DIRECTOR_TASKS) {
      const manifest = TASK_CONTEXT_MANIFESTS[task.id];
      const unknown = assertManifestSlicesKnown(manifest.slices);
      expect(unknown, task.id).toEqual([]);
    }
  });

  it('manifest slices cover declared required paths', () => {
    for (const task of DIRECTOR_TASKS) {
      const manifest = TASK_CONTEXT_MANIFESTS[task.id];
      const fromSlices = pathsForManifestSlices(manifest.slices);
      const required = requiredPathsForTask(task.id);
      for (const path of required) {
        expect(fromSlices, `${task.id} missing slice for ${path}`).toContain(path);
      }
    }
  });

  it('SLICE_REQUIRED_PATHS has no empty slice', () => {
    for (const [slice, paths] of Object.entries(SLICE_REQUIRED_PATHS)) {
      expect(paths.length, slice).toBeGreaterThan(0);
    }
  });
});
