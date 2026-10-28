import "server-only";

// Small in-memory sliding-window limiter for the login action. It is per server process, which
// is enough for a single instance; use a shared store if the app ever runs on several.
const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  attempts.set(key, recent);
  return recent.length >= limit;
}

export function recordFailure(key: string, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
