import { createHash, createHmac, timingSafeEqual } from "crypto"
import { allowRequest, isLocked } from "@/app/lib/rate-limit"

export const ADMIN_COOKIE = "tulip_admin"
const SESSION_SECONDS = 60 * 60 * 12

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous"
}

const digest = (v: string) => createHash("sha256").update(v).digest()
const adminPassword = () => (process.env.ADMIN_PASSWORD || "").trim()
const secret = () => process.env.ADMIN_SESSION_SECRET || adminPassword()
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex")

export function adminConfigured() {
  return adminPassword().length >= 8
}

/** Checks the submitted password; counts failures per IP (8 per 15 min). */
export function checkPassword(req: Request, given: string) {
  if (!adminConfigured() || !given) return false
  const key = `adminfail:${clientIp(req)}`
  if (isLocked(key, 8)) return false
  const ok = timingSafeEqual(digest(adminPassword()), digest(given))
  if (!ok) allowRequest(key, 8, 15 * 60_000)
  return ok
}

export function createSession() {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
  return { value: `${exp}.${sign(exp)}`, maxAge: SESSION_SECONDS }
}

function cookieValue(req: Request) {
  const raw = req.headers.get("cookie") || ""
  const hit = raw
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`))
  return hit ? decodeURIComponent(hit.slice(ADMIN_COOKIE.length + 1)) : ""
}

/** True when the request carries an admin session cookie (valid or not). */
export const hasAdminCookie = (req: Request) => !!cookieValue(req)

/** True only for a valid, unexpired, correctly signed admin session. */
export function isAdmin(req: Request) {
  if (!adminConfigured()) return false
  const [exp, mac] = cookieValue(req).split(".")
  if (!exp || !mac || Number(exp) < Date.now() / 1000) return false
  const a = Buffer.from(mac),
    b = Buffer.from(sign(exp))
  return a.length === b.length && timingSafeEqual(a, b)
}
