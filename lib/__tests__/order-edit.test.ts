import { beforeEach, describe, expect, it, vi } from "vitest"

const sanity = { costs: [] as any[], products: [] as any[], fees: [{ name: "Cairo", feeEgp: 60 }, { name: "Aswan", feeEgp: 130 }] }
vi.mock("@/sanity/client", () => ({
  client: {
    fetch: async (q: string) =>
      q.includes("shippingSettings") ? sanity.fees : q.includes("{_id,cost}") ? sanity.costs : sanity.products,
  },
}))
import { buildOrderEdit } from "@/lib/order-edit"

const product = (id: string, price: number, extra: any = {}) => ({
  _id: id, name: id.toUpperCase(), price, sizes: ["S", "M", "L"],
  colors: [{ name: "Cream", images: [], entries: extra.entries, soldOut: false }],
})
const sbWith = (coupon: any) =>
  ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: coupon }) }) }) }) }) as any
const order = (over: any = {}) => ({
  items: [{ id: "p1", name: "P1", size: "M", color: "Cream", qty: 1, price: 700 }],
  subtotal: 700, discount: 0, shipping: 60, coupon: null, governorate: "Cairo", ...over,
})
const line = (id: string, qty: number, size = "M") => ({ id, size, color: "Cream", qty })

beforeEach(() => {
  sanity.products = [product("p1", 999), product("p2", 300)]
  sanity.costs = [{ _id: "p1", cost: 450 }, { _id: "p2", cost: 120 }]
})

describe("buildOrderEdit", () => {
  it("adds a product at today's price and keeps the old line's original price", async () => {
    const r: any = await buildOrderEdit(sbWith(null), order(), { items: [line("p1", 1), line("p2", 2, "S")] })
    expect(r.patch.items.map((l: any) => [l.id, l.qty, l.price])).toEqual([["p1", 1, 700], ["p2", 2, 300]])
    expect(r.patch.subtotal).toBe(1300)
    expect(r.patch.total).toBe(1360) // 1300 + 60 shipping
  })

  it("keeps the saved cost of old lines and takes today's cost for a new line", async () => {
    const o = order({ items: [{ id: "p1", name: "P1", size: "M", color: "Cream", qty: 1, price: 700, cost: 400 }] })
    const r: any = await buildOrderEdit(sbWith(null), o, { items: [line("p1", 2), line("p2", 1, "S")] })
    expect(r.patch.items.map((l: any) => [l.id, l.cost])).toEqual([["p1", 400], ["p2", 120]]) // p1 stays 400, not today's 450
  })

  it("a new line whose product has no cost simply has no cost key", async () => {
    sanity.costs = []
    const r: any = await buildOrderEdit(sbWith(null), order(), { items: [line("p1", 1), line("p2", 1, "S")] })
    expect("cost" in r.patch.items[1]).toBe(false)
  })

  it("removes a product", async () => {
    const o = order({ items: [...order().items, { id: "p2", name: "P2", size: "S", color: "Cream", qty: 1, price: 300 }], subtotal: 1000 })
    const r: any = await buildOrderEdit(sbWith(null), o, { items: [line("p1", 1)] })
    expect(r.patch.items).toHaveLength(1)
    expect(r.patch.subtotal).toBe(700)
  })

  it("refuses an empty order (cancel instead)", async () => {
    const r: any = await buildOrderEdit(sbWith(null), order(), { items: [] })
    expect(r.status).toBe(400)
    expect(r.error).toMatch(/at least one item/i)
  })

  it("refuses a new line that is sold out or unknown", async () => {
    sanity.products = [product("p1", 700), { ...product("p3", 100), colors: [{ name: "Cream", images: [], soldOut: true }] }]
    const soldOut: any = await buildOrderEdit(sbWith(null), order(), { items: [line("p1", 1), line("p3", 1)] })
    expect(soldOut.status).toBe(409)
    const ghost: any = await buildOrderEdit(sbWith(null), order(), { items: [line("p1", 1), line("nope", 1)] })
    expect(ghost.status).toBe(409)
    const badSize: any = await buildOrderEdit(sbWith(null), order(), { items: [line("p1", 1), line("p2", 1, "XXL")] })
    expect(badSize.status).toBe(409)
  })

  it("does not re-check lines that were already in the order and did not grow", async () => {
    sanity.products = [] // product vanished from Sanity after the order was placed
    const r: any = await buildOrderEdit(sbWith(null), order(), { items: [line("p1", 1)] })
    expect(r.patch.subtotal).toBe(700)
  })

  it("caps quantity at 10 and merges duplicate lines", async () => {
    const r: any = await buildOrderEdit(sbWith(null), order(), { items: [line("p2", 8, "S"), line("p2", 8, "S")] })
    expect(r.patch.items[0].qty).toBe(10)
  })

  it("recalculates a percentage coupon on the new subtotal", async () => {
    const coupon = { kind: "percentage", value: 10, minimum_order: 0 }
    const r: any = await buildOrderEdit(sbWith(coupon), order({ coupon: "WELCOME10", discount: 70 }), { items: [line("p1", 1), line("p2", 2, "S")] })
    expect(r.patch.discount).toBe(130) // 10% of 1300
    expect(r.patch.total).toBe(1300 - 130 + 60)
  })

  it("drops the discount when the minimum order is no longer met", async () => {
    const coupon = { kind: "fixed", value: 100, minimum_order: 1000 }
    const o = order({ coupon: "BIG", discount: 100, subtotal: 1400, items: [{ id: "p1", name: "P1", size: "M", color: "Cream", qty: 2, price: 700 }] })
    const r: any = await buildOrderEdit(sbWith(coupon), o, { items: [line("p1", 1)] })
    expect(r.patch.discount).toBe(0)
  })

  it("changes the shipping fee with the governorate, and rejects unknown ones", async () => {
    const ok: any = await buildOrderEdit(sbWith(null), order(), { governorate: "Aswan" })
    expect(ok.patch.shipping).toBe(130)
    expect(ok.patch.governorate).toBe("Aswan")
    expect(ok.patch.total).toBe(700 + 130)
    const bad: any = await buildOrderEdit(sbWith(null), order(), { governorate: "Atlantis" })
    expect(bad.status).toBe(400)
  })

  it("an address-only edit leaves items and totals alone", async () => {
    const r: any = await buildOrderEdit(sbWith(null), order(), {})
    expect(r.patch.items).toBeUndefined()
    expect(r.patch.total).toBe(760)
  })
})
