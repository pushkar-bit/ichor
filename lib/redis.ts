import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!client) client = new Redis({ url, token });
  return client;
}

export async function addScore(key: string, member: string, score: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.zadd(key, { score, member });
}

export async function getLeaderboard(key: string, limit: number): Promise<{ member: string; score: number }[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });
  const entries: { member: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ member: String(raw[i]), score: Number(raw[i + 1]) });
  }
  return entries;
}

export async function getUserRank(key: string, member: string): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  const rank = await redis.zrevrank(key, member);
  return rank === null || rank === undefined ? null : rank + 1;
}

export async function getUserScore(key: string, member: string): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  const score = await redis.zscore(key, member);
  return score === null || score === undefined ? null : Number(score);
}

export async function deleteKey(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(key);
}

export async function setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function getWithCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  const value = await redis.get<T>(key);
  return value ?? null;
}
