const buckets = new Map<string, { count: number; resetAt: number }>()

export function allowRequest(key: string, limit = 12, windowMs = 60_000) {
  const now = Date.now()
  if (buckets.size > 5000) for (const [storedKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(storedKey)
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}

export function isLocked(key: string, limit: number) {
  const entry = buckets.get(key)
  return !!entry && entry.resetAt > Date.now() && entry.count >= limit
}

/**
 * Returns true when the request should be BLOCKED.
 * Uses Upstash Redis (shared across serverless instances) when UPSTASH_REDIS_REST_URL/TOKEN are set,
 * otherwise falls back to the in-memory limiter.
 */
export async function limited(key: string, limit = 12, windowMs = 60_000) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return !allowRequest(key, limit, windowMs)
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["PEXPIRE", `rl:${key}`, windowMs, "NX"],
      ]),
      cache: "no-store",
    })
    const data = await res.json()
    return Number(data?.[0]?.result) > limit
  } catch {
    return !allowRequest(key, limit, windowMs)
  }
}
