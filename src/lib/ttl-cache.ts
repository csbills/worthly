type Entry = { expiresAt: number; value: Promise<unknown> };

/**
 * Small in-memory cache with a fixed time to live. Concurrent callers share
 * the same in-flight promise, and failed loads are dropped so the next call
 * retries.
 */
export function createTtlCache({
  ttlMs,
  now = Date.now,
}: {
  ttlMs: number;
  now?: () => number;
}) {
  const entries = new Map<string, Entry>();

  return {
    get<T>(key: string, load: () => Promise<T>): Promise<T> {
      const entry = entries.get(key);

      if (entry && entry.expiresAt > now()) {
        return entry.value as Promise<T>;
      }

      const value = load();
      entries.set(key, { expiresAt: now() + ttlMs, value });
      value.catch(() => {
        if (entries.get(key)?.value === value) {
          entries.delete(key);
        }
      });

      return value;
    },
    clear() {
      entries.clear();
    },
  };
}
