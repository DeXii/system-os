import { useEffect, type DependencyList } from 'react';

/**
 * Async effect with AbortSignal — ignores result after unmount or deps change.
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: DependencyList
): void {
  useEffect(() => {
    const ac = new AbortController();
    void effect(ac.signal).catch(() => {
      /* caller may handle errors */
    });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effect identity is intentional
  }, deps);
}
