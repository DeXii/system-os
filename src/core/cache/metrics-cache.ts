const TTL_MS = 60_000;
const store = new Map<string, { value: unknown; expires: number }>();

export function getMetricsCached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    return Promise.resolve(hit.value as T);
  }
  return loader().then((value) => {
    store.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  });
}

export function clearMetricsCache(): void {
  store.clear();
}
