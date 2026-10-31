import { describe, expect, it } from "vitest"
import { checkVariant, discountPercent, normalizeProduct, sizesForColor } from "@/lib/products"

const raw = {
  _id: "p1",
  name: "Serum",
  price: 700,
  sizes: ["S", "M"],
  colors: [
    {
      name: "Rose",
      hex: "#fef5d8",
      soldOut: false,
      images: ["a", "b"],
      entries: [
        { size: "S", soldOut: true },
        { size: "M", soldOut: false },
      ],
    },
    { name: "Black", soldOut: true, images: ["c"] },
  ],
}

describe("normalizeProduct", () => {
  const p = normalizeProduct(raw)
  it("takes image from the first available colour", () => expect(p.image).toBe("a"))
  it("is in stock when any colour is available", () => expect(p.inStock).toBe(true))
  it("is sold out when every colour is sold out", () => {
    expect(normalizeProduct({ ...raw, colors: [{ name: "Black", soldOut: true, images: [] }] }).inStock).toBe(false)
  })
  it("marks a colour sold out when all its sizes are sold out", () => {
    const q = normalizeProduct({ ...raw, sizes: ["S"], colors: [{ name: "X", images: [], entries: [{ size: "S", soldOut: true }] }] })
    expect(q.colors[0].soldOut).toBe(true)
  })
  it("does NOT sold-out a colour while another size is still on sale", () => {
    expect(p.colors[0].soldOut).toBe(false) // S is sold out, M is not
  })
})

describe("Sanity returns null for fields nobody filled in", () => {
  // The real shape of a product whose colours have no "stock by size" rows: `entries: null`, not a missing key.
  const nulls: any = {
    _id: "x", name: "Serum", price: 500, originalPrice: null, badge: null, description: null, category: null, categoryId: null,
    sizes: ["S", "M"], sizeGuide: null,
    colors: [{ name: "Rose", hex: null, soldOut: null, images: null, entries: null }, null],
  }
  it("does not crash and shows every size", () => {
    const q = normalizeProduct(nulls)
    expect(q.colors).toHaveLength(1)
    expect(q.colors[0].sizes.map((s) => s.size)).toEqual(["S", "M"])
    expect(q.colors[0].soldOut).toBe(false)
    expect(q.sizeGuide).toEqual([])
    expect(q.originalPrice).toBeUndefined()
    expect(q.inStock).toBe(true)
  })
  it("survives null sizes / null colours / null everything", () => {
    expect(() => normalizeProduct({ _id: "y", sizes: null, colors: null, sizeGuide: null } as any)).not.toThrow()
    expect(sizesForColor(null, null)).toEqual([])
    expect(sizesForColor(["S"], [null, { size: null }])).toEqual([{ size: "S", soldOut: false }])
  })
})

describe("sizes", () => {
  it("shows every size of the product even when only some have a stock row", () => {
    const q = normalizeProduct({
      ...raw,
      sizes: ["XS", "S", "M", "L", "XL"],
      colors: [{ name: "Rose", images: [], entries: [{ size: "M", soldOut: false }] }],
    })
    expect(q.colors[0].sizes.map((s) => s.size)).toEqual(["XS", "S", "M", "L", "XL"])
    expect(q.colors[0].sizes.every((s) => !s.soldOut)).toBe(true)
  })
  it("a stock row only matters when it ticks sold out", () => {
    const list = sizesForColor(["S", "M", "L"], [{ size: "L", soldOut: true }])
    expect(list).toEqual([
      { size: "S", soldOut: false },
      { size: "M", soldOut: false },
      { size: "L", soldOut: true },
    ])
  })
  it("orders skincare sizes by number, keeps unknown orders as typed, and never duplicates", () => {
    expect(sizesForColor(["100 ml", "30 ml", "50 ml", "30 ml"]).map((s) => s.size)).toEqual(["30 ml", "50 ml", "100 ml"])
    expect(sizesForColor(["Travel size", "50 ml"]).map((s) => s.size)).toEqual(["Travel size", "50 ml"])
  })
  it("keeps a size that only exists in a stock row", () => {
    expect(sizesForColor(["S"], [{ size: "XXL" }]).map((s) => s.size)).toEqual(["S", "XXL"])
  })
  it("a product without sizes has none", () => expect(sizesForColor([])).toEqual([]))
})

describe("checkVariant", () => {
  const p = normalizeProduct(raw)
  it("accepts an available colour and size", () => expect(checkVariant(p, "Rose", "M")).toBeNull())
  it("rejects sold-out size", () => expect(checkVariant(p, "Rose", "S")).toBe("soldout"))
  it("rejects sold-out colour", () => expect(checkVariant(p, "Black", "M")).toBe("soldout"))
  it("rejects unknown colour or size", () => {
    expect(checkVariant(p, "Pink", "M")).toBe("color")
    expect(checkVariant(p, "Rose", "XL")).toBe("size")
  })
})

describe("discountPercent", () => {
  it("rounds to a whole percent", () => {
    expect(discountPercent(800, 1000)).toBe(20)
    expect(discountPercent(667, 1000)).toBe(33)
  })
  it("is 0 when there is no discount, or the data is missing/odd", () => {
    for (const [a, b] of [[1000, 1000], [1200, 1000], [500, null], [500, undefined], [500, 0], [null, 900], ["x", 900]] as const)
      expect(discountPercent(a, b)).toBe(0)
  })
  it("never shows 0% for a tiny real discount", () => expect(discountPercent(999, 1000)).toBe(1))
})
