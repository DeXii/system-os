import { useEffect, type DependencyList } from 'react';

/**
 * Async effect with AbortSignal — ignores result after unmount or deps change.
 * Errors are logged; pass onError for UI feedback.
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList,
  onError?: (error: unknown) => void
): void {
  useEffect(() => {
    const ac = new AbortController();
    void effect(ac.signal).catch((err) => {
      if (ac.signal.aborted) return;
      onError?.(err);
      console.error('[useAsyncEffect]', err);
    });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effect identity is intentional
  }, deps);
}

/** Guard setState after awaited work in async loaders. */
export function isAborted(signal: AbortSignal): boolean {
  return signal.aborted;
}
