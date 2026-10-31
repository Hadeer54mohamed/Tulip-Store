import { describe, expect, it, vi } from "vitest"

const rows: { _id: string; cost?: unknown }[] = []
let fail = false
vi.mock("@/sanity/client", () => ({
  client: { fetch: async () => { if (fail) throw new Error("down"); return rows } },
}))
import { fetchCosts, orderMoney, withCost } from "@/lib/profit"

describe("fetchCosts / withCost", () => {
  it("returns a cost only for valid numbers (0 is valid, missing/negative/text are unknown)", async () => {
    rows.length = 0
    rows.push({ _id: "a", cost: 400 }, { _id: "b", cost: 0 }, { _id: "c" }, { _id: "d", cost: -5 }, { _id: "e", cost: "12" })
    const c = await fetchCosts(["a", "b", "c", "d", "e", "gone"])
    expect([c.get("a"), c.get("b"), c.get("c"), c.get("d"), c.get("e"), c.get("gone")]).toEqual([400, 0, null, null, null, undefined])
  })
  it("never throws when Sanity is down — the order just has no cost", async () => {
    fail = true
    expect((await fetchCosts(["a"])).size).toBe(0)
    fail = false
  })
  it("withCost adds the key only when the cost is known", () => {
    const m = new Map<string, number | null>([["a", 400], ["b", null]])
    expect(withCost({ id: "a", qty: 1 }, m)).toEqual({ id: "a", qty: 1, cost: 400 })
    expect("cost" in withCost({ id: "b", qty: 1 }, m)).toBe(false)
    expect("cost" in withCost({ id: "zzz", qty: 1 }, m)).toBe(false)
  })
})

describe("orderMoney", () => {
  it("profit = (subtotal − discount) − Σ qty×cost, shipping not involved", () => {
    const m = orderMoney({ status: "new", subtotal: 1400, discount: 140, items: [{ qty: 2, cost: 400 }] })
    expect(m).toMatchObject({ revenue: 1260, cost: 800, costComplete: true, profit: 460 })
  })
  it("multi-line orders", () => {
    expect(orderMoney({ subtotal: 1400, discount: 0, items: [{ qty: 1, cost: 200 }, { qty: 3, cost: 100 }] }).profit).toBe(900)
  })
  it("an order with a missing cost has NO profit (not 100 %)", () => {
    const m = orderMoney({ subtotal: 900, discount: 0, items: [{ qty: 1, cost: 200 }, { qty: 1 }] })
    expect(m.profit).toBeNull()
    expect(m.costComplete).toBe(false)
  })
  it("cost 0 is a real cost", () => expect(orderMoney({ subtotal: 100, discount: 0, items: [{ qty: 1, cost: 0 }] }).profit).toBe(100))
  it("cancelled orders earn nothing", () => {
    const m = orderMoney({ status: "cancelled", subtotal: 500, discount: 0, items: [{ qty: 1, cost: 1 }] })
    expect(m).toMatchObject({ revenue: 0, profit: null })
  })
  it("a loss shows as a negative number", () => expect(orderMoney({ subtotal: 100, discount: 0, items: [{ qty: 1, cost: 150 }] }).profit).toBe(-50))
  it("empty / odd data does not crash", () => {
    expect(orderMoney({ items: null }).profit).toBeNull()
    expect(orderMoney({ subtotal: "x", items: [] }).revenue).toBe(0)
  })
})
