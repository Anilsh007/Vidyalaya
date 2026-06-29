type RateLimitRecord = {
  failures: number;
  blockedUntil: number;
  lastFailedAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const attempts = new Map<string, RateLimitRecord>();

function now() {
  return Date.now();
}

function getRecord(identifier: string) {
  const current = attempts.get(identifier);
  if (!current) {
    return null;
  }

  if (now() - current.lastFailedAt > WINDOW_MS && current.blockedUntil <= now()) {
    attempts.delete(identifier);
    return null;
  }

  return current;
}

export function getLoginRateLimitState(identifier: string) {
  const record = getRecord(identifier);
  if (!record) {
    return { allowed: true as const, retryAfterMs: 0 };
  }

  if (record.blockedUntil > now()) {
    return {
      allowed: false as const,
      retryAfterMs: Math.max(0, record.blockedUntil - now())
    };
  }

  return { allowed: true as const, retryAfterMs: 0 };
}

export function registerFailedLoginAttempt(identifier: string) {
  const current = getRecord(identifier);
  const failures = (current?.failures ?? 0) + 1;
  const record: RateLimitRecord = {
    failures,
    blockedUntil: failures >= MAX_FAILURES ? now() + BLOCK_MS : 0,
    lastFailedAt: now()
  };

  attempts.set(identifier, record);
  return record;
}

export function clearLoginRateLimit(identifier: string) {
  attempts.delete(identifier);
}

