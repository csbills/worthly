const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Attempts = { failures: number; firstFailureAt: number };

// One process serves one person's instance, so memory is enough here; a
// restart simply forgets the counters.
const attempts = new Map<string, Attempts>();

export function isLoginLocked(key: string, now = Date.now()) {
  const entry = attempts.get(key);

  if (!entry) return false;
  if (now - entry.firstFailureAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }

  return entry.failures >= MAX_FAILURES;
}

export function recordLoginFailure(key: string, now = Date.now()) {
  const entry = attempts.get(key);

  if (!entry || now - entry.firstFailureAt > WINDOW_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now });
    return;
  }

  entry.failures += 1;
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

export function resetLoginAttempts() {
  attempts.clear();
}
