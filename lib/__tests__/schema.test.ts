import { it, expect, vi } from "vitest"
vi.mock("sanity", () => ({ defineType: (x: any) => x, defineField: (x: any) => x, defineArrayMember: (x: any) => x }))
vi.mock("lucide-react", () => ({ Film: () => null }))
vi.mock("../../sanity/components/HomeSliderColorsInput", () => ({ HomeSliderColorsInput: () => null }))
it("schema loads & previews run", async () => {
  const { schema } = (await import("../../sanity/schemaTypes/index.js")) as any
  const product = schema.types.find((t: any) => t.name === "product")
  const colors = product.fields.find((f: any) => f.name === "colors").of[0]
  const entry = colors.fields.find((f: any) => f.name === "stockEntries").of[0]
  expect(entry.preview.prepare({ size: "M", stock: 3, soldOut: false }).subtitle).toContain("3")
  expect(entry.preview.prepare({ size: "L", soldOut: true }).subtitle).toContain("SOLD OUT")
  expect(colors.preview.prepare({ title: "Cream", hex: "#fff", entries: [{ size: "S", soldOut: true }] }).subtitle).toContain("S")
  expect(product.preview.prepare({ title: "Scarf", categoryTitle: "Scarves", price: 700 }).subtitle).toBe("Scarves · 700 EGP")
  const sizes = product.fields.find((f: any) => f.name === "sizes")
  expect(sizes.options.list.map((x: any) => x.value)).toContain("Standard")
  expect(entry.fields.find((f: any) => f.name === "size").options.list).toEqual(sizes.options.list)
})
