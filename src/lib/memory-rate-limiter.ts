import { RateLimiter, RateLimitResult } from "./rate-limiter.interface";

const memoryStore = new Map<string, { count: number; resetTime: number }>();

export class MemoryRateLimiter implements RateLimiter {
  async rateLimit(key: string, intervalMs: number, maxRequests: number): Promise<RateLimitResult> {
    const now = Date.now();
    const record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      const newRecord = {
        count: 1,
        resetTime: now + intervalMs,
      };
      memoryStore.set(key, newRecord);
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetTime: newRecord.resetTime,
      };
    }

    if (record.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count += 1;
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }
}

// Export a singleton instance (Future Upgrade: swap this with RedisRateLimiter)
export const rateLimiter: RateLimiter = new MemoryRateLimiter();
