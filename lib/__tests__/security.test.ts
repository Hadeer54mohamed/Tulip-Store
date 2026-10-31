import { beforeEach, describe, expect, it } from "vitest"
import { allowRequest, isLocked } from "@/app/lib/rate-limit"
import { checkPassword, createSession, isAdmin } from "@/lib/admin-auth"

const req = (headers: Record<string, string> = {}) => new Request("http://x.test", { headers })

describe("rate limit", () => {
  it("blocks after the limit", () => {
    for (let i = 0; i < 3; i++) expect(allowRequest("t:a", 3)).toBe(true)
    expect(allowRequest("t:a", 3)).toBe(false)
    expect(isLocked("t:a", 3)).toBe(true)
  })
})

describe("admin auth", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "correct-horse-battery"
  })

  it("accepts the right password and rejects the wrong one", () => {
    expect(checkPassword(req({ "x-forwarded-for": "1.1.1.1" }), "correct-horse-battery")).toBe(true)
    expect(checkPassword(req({ "x-forwarded-for": "1.1.1.2" }), "nope")).toBe(false)
  })
  it("locks out an IP after repeated failures", () => {
    const r = req({ "x-forwarded-for": "9.9.9.9" })
    for (let i = 0; i < 8; i++) checkPassword(r, "bad")
    expect(checkPassword(r, "correct-horse-battery")).toBe(false)
  })
  it("validates signed session cookies only", () => {
    const { value } = createSession()
    expect(isAdmin(req({ cookie: `tulip_admin=${value}` }))).toBe(true)
    expect(isAdmin(req({ cookie: `tulip_admin=${value}x` }))).toBe(false)
    expect(isAdmin(req({ cookie: "tulip_admin=9999999999.deadbeef" }))).toBe(false)
    expect(isAdmin(req())).toBe(false)
  })
  it("fails closed when no/weak password is configured", () => {
    process.env.ADMIN_PASSWORD = "short"
    expect(checkPassword(req(), "short")).toBe(false)
    expect(isAdmin(req({ cookie: `tulip_admin=${createSession().value}` }))).toBe(false)
  })
})
