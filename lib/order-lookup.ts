export const ORDER_PREFIX = "TULIP"

export type Lookup =
  | { type: "phone"; value: string }
  | { type: "id"; value: string; candidates: string[] }

/** Normalises an Egyptian mobile (01XXXXXXXXX, +20…, 0020…, spaces/dashes allowed). Returns null if it is not one. */
export function normalizePhone(input: string): string | null {
  const raw = String(input ?? "")
    .trim()
    .replace(/[\s\-().]/g, "")
  const intl = raw.match(/^(?:\+|00)?20(1\d{9})$/)
  const phone = intl ? `0${intl[1]}` : raw
  return /^01\d{9}$/.test(phone) ? phone : null
}

/**
 * Every spelling of an order number we should try: "tulip 123456", "TULIP-123456", "tulip123456", "#123456" and "123456"
 * all find TULIP-123456; short numbers (1001) also match old orders that were numbered before TULIP numbers existed.
 */
export function orderIdCandidates(input: string): string[] {
  const cleaned = String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/[\s_]+/g, "")
  if (!cleaned) return []
  const m = cleaned.match(new RegExp(`^(?:${ORDER_PREFIX})?-?(\\d{1,12})$`))
  if (m) return [`${ORDER_PREFIX}-${m[1]}`, m[1]]
  if (/^[A-Z0-9-]{1,40}$/.test(cleaned)) return [cleaned]
  return []
}

/** Accepts an order number (TULIP-123456) or an Egyptian mobile number. */
export function parseLookup(input: string): Lookup | null {
  const phone = normalizePhone(input)
  if (phone) return { type: "phone", value: phone }
  const candidates = orderIdCandidates(input)
  return candidates.length ? { type: "id", value: candidates[0], candidates } : null
}

/** Makes free text safe to drop inside a PostgREST `or()` filter. */
export const safeSearchText = (input: string) =>
  String(input ?? "")
    .replace(/[,()*"\\%:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
