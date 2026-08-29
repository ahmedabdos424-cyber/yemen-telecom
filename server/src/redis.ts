import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;
let redisConnecting: Promise<void> | null = null;

export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

export async function initRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('[REDIS] REDIS_URL not set — rate limiting and login lockout will use in-memory fallback');
    return;
  }

  if (redisClient?.isOpen) return;

  if (!redisConnecting) {
    redisConnecting = (async () => {
      try {
        redisClient = createClient({ url });
        redisClient.on('error', (err) => logger.error('[REDIS] Client error:', err));
        redisClient.on('connect', () => logger.info('[REDIS] Connected'));
        redisClient.on('ready', () => logger.info('[REDIS] Ready'));
        redisClient.on('reconnecting', () => logger.info('[REDIS] Reconnecting...'));
        await redisClient.connect();
      } catch (err) {
        logger.error('[REDIS] Failed to connect:', err);
        redisClient = null;
        throw err;
      } finally {
        redisConnecting = null;
      }
    })();
  }
  await redisConnecting;
}

export async function closeRedis(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Distributed rate limiting using Redis sorted sets (sliding window)
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  totalHits: number;
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const client = getRedisClient();
  if (!client) {
    // Fallback: allow all requests if Redis unavailable
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs, totalHits: 0 };
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  try {
    const multi = client.multi();
    // Remove expired entries
    multi.zRemRangeByScore(redisKey, 0, windowStart);
    // Count current entries
    multi.zCard(redisKey);
    // Add current request
    multi.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });
    // Set expiry on the key
    multi.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
    const results = await multi.exec();

    const currentCount = results[1] as number;
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);

    if (!allowed) {
      // Remove the request we just added since it's over limit
      await client.zRem(redisKey, `${now}:${Math.random()}`);
    }

    return {
      allowed,
      remaining,
      resetAt: now + windowMs,
      totalHits: currentCount + (allowed ? 1 : 0),
    };
  } catch (err) {
    logger.error('[REDIS] Rate limit check failed:', err);
    // Fail open — allow request if Redis is down
    return { allowed: true, remaining: maxRequests, resetAt: now + windowMs, totalHits: 0 };
  }
}

// Distributed login lockout using Redis
export interface LoginLockResult {
  locked: boolean;
  remainingMs: number;
  lockLevel: number;
}

export async function checkLoginLock(username: string, ip: string): Promise<LoginLockResult> {
  const client = getRedisClient();
  if (!client) return { locked: false, remainingMs: 0, lockLevel: 0 };

  const key = `loginlock:${username.toLowerCase()}|${ip}`;
  try {
    const data = await client.hGetAll(key);
    if (!data || Object.keys(data).length === 0) {
      return { locked: false, remainingMs: 0, lockLevel: 0 };
    }
    const lockedUntil = parseInt(data.lockedUntil || '0', 10);
    const lockLevel = parseInt(data.lockLevel || '0', 10);
    const remainingMs = Math.max(0, lockedUntil - Date.now());
    return { locked: remainingMs > 0, remainingMs, lockLevel };
  } catch (err) {
    logger.error('[REDIS] Login lock check failed:', err);
    return { locked: false, remainingMs: 0, lockLevel: 0 };
  }
}

export async function recordLoginFailureRedis(username: string, ip: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  const key = `loginlock:${username.toLowerCase()}|${ip}`;
  const LOCK_DURATIONS_MS = [60_000, 120_000, 300_000, 900_000]; // 1m, 2m, 5m, 15m
  const MAX_FAILED_LOGINS = 5;
  const LOGIN_LOCK_TTL_MS = 30 * 60 * 1000;

  try {
    const now = Date.now();
    const data = await client.hGetAll(key);
    let failures = parseInt(data.failures || '0', 10);
    let lockLevel = parseInt(data.lockLevel || '0', 10);
    let lockedUntil = parseInt(data.lockedUntil || '0', 10);

    // Reset if lock expired and TTL passed
    if (now > lockedUntil && now - lockedUntil > LOGIN_LOCK_TTL_MS) {
      failures = 0;
      lockLevel = 0;
      lockedUntil = 0;
    }

    failures += 1;

    if (failures >= MAX_FAILED_LOGINS) {
      const level = Math.min(lockLevel, LOCK_DURATIONS_MS.length - 1);
      lockLevel = Math.min(lockLevel + 1, LOCK_DURATIONS_MS.length - 1);
      lockedUntil = now + LOCK_DURATIONS_MS[level];
      failures = 0;

      await client.hSet(key, {
        failures: failures.toString(),
        lockedUntil: lockedUntil.toString(),
        lockLevel: lockLevel.toString(),
      });
      await client.expire(key, Math.ceil((lockedUntil - now + LOGIN_LOCK_TTL_MS) / 1000));

      return LOCK_DURATIONS_MS[level];
    }

    await client.hSet(key, {
      failures: failures.toString(),
      lockedUntil: lockedUntil.toString(),
      lockLevel: lockLevel.toString(),
    });
    await client.expire(key, Math.ceil(LOGIN_LOCK_TTL_MS / 1000));

    return 0;
  } catch (err) {
    logger.error('[REDIS] Record login failure failed:', err);
    return 0;
  }
}

export async function recordLoginSuccessRedis(username: string, ip: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const key = `loginlock:${username.toLowerCase()}|${ip}`;
  try {
    await client.del(key);
  } catch (err) {
    logger.error('[REDIS] Record login success failed:', err);
  }
}

export async function clearExpiredLoginLocksRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    // Scan for loginlock keys and clean expired ones
    // Note: For production with many keys, use a scheduled job with SCAN
    const keys = await client.keys('loginlock:*');
    const now = Date.now();
    const LOGIN_LOCK_TTL_MS = 30 * 60 * 1000;

    for (const key of keys) {
      const data = await client.hGetAll(key);
      const lockedUntil = parseInt(data.lockedUntil || '0', 10);
      if (now > lockedUntil + LOGIN_LOCK_TTL_MS) {
        await client.del(key);
      }
    }
  } catch (err) {
    logger.error('[REDIS] Clear expired login locks failed:', err);
  }
}