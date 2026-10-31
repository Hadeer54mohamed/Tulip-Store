import { describe, expect, it } from "vitest"
import { normalizePhone, orderIdCandidates, parseLookup, safeSearchText } from "@/lib/order-lookup"

describe("parseLookup", () => {
  it("finds TULIP numbers however they are typed", () => {
    for (const input of ["TULIP-123456", "tulip-123456", " tulip 123456 ", "TULIP123456", "#tulip-123456", "123456"])
      expect(parseLookup(input)).toMatchObject({ type: "id", value: "TULIP-123456" })
  })
  it("keeps old numeric orders reachable", () => {
    expect(parseLookup(" 1001 ")).toEqual({ type: "id", value: "TULIP-1001", candidates: ["TULIP-1001", "1001"] })
  })
  it("detects Egyptian phones", () => {
    expect(parseLookup("01012345678")).toEqual({ type: "phone", value: "01012345678" })
  })
  it("normalises +20 / 0020 and separators", () => {
    expect(parseLookup("+20 101-234-5678")).toEqual({ type: "phone", value: "01012345678" })
    expect(parseLookup("0020 101 234 5678")).toEqual({ type: "phone", value: "01012345678" })
  })
  it("rejects empty or unsafe input", () => {
    expect(parseLookup("")).toBeNull()
    expect(parseLookup("1; drop table orders")).toBeNull()
  })
})

describe("helpers", () => {
  it("normalizePhone returns null for non-phones", () => {
    expect(normalizePhone("TULIP-123456")).toBeNull()
    expect(normalizePhone("0212345678")).toBeNull()
  })
  it("orderIdCandidates handles junk", () => expect(orderIdCandidates("  ")).toEqual([]))
  it("safeSearchText strips filter-breaking characters", () =>
    expect(safeSearchText("a,b)(c%*")).toBe("a b c"))
})
