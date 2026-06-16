export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export interface RateLimiter {
  rateLimit(key: string, intervalMs: number, maxRequests: number): Promise<RateLimitResult>;
}
