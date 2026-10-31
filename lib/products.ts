/** Single place that understands the Sanity product schema (colors → images + stock by size). */

export const PRODUCT_FIELDS = `_id,name,price,originalPrice,badge,description,sizes,skinTypes,ingredients,howToUse,"category":category->title,"categoryId":category._ref,sizeGuide[]{size,description},"colors":colors[]{name,"hex":value.hex,soldOut,"images":images[0...12],"entries":stockEntries[]{size,soldOut}}`

/** "20" for a product at 800 that used to cost 1000; 0 when there is no real discount. */
export function discountPercent(price: unknown, originalPrice: unknown): number {
  // null / "" / undefined must not become 0 (that would read as "100 % off")
  const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN)
  const now = num(price), was = num(originalPrice)
  if (!Number.isFinite(now) || !Number.isFinite(was) || now <= 0 || was <= 0 || now >= was) return 0
  return Math.max(1, Math.round(((was - now) / was) * 100))
}

export type SizeOption = { size: string; soldOut: boolean }
export type ColorOption = { name: string; hex?: string; soldOut: boolean; images: unknown[]; sizes: SizeOption[] }
export type ShopProduct = {
  _id: string
  name: string
  price: number
  originalPrice?: number
  badge?: string
  description?: string
  category?: string
  categoryId?: string
  image?: unknown
  images: unknown[]
  sizes: string[]
  sizeGuide: { size?: string; description?: string }[]
  skinTypes: string[]
  ingredients?: string
  howToUse?: string
  colors: ColorOption[]
  inStock: boolean
}

// Every optional field can be `null` when it comes from Sanity.
type RawColor = {
  name?: string | null
  hex?: string | null
  soldOut?: boolean | null
  images?: unknown[] | null
  entries?: { size?: string | null; soldOut?: boolean | null }[] | null
}
type RawProduct = Omit<Partial<ShopProduct>, "colors" | "sizes" | "sizeGuide" | "skinTypes"> & {
  skinTypes?: (string | null)[] | null
  _id: string
  sizes?: (string | null)[] | null
  sizeGuide?: { size?: string; description?: string }[] | null
  colors?: (RawColor | null)[] | null
}

/** Skincare sizes ("30 ml", "1.7 oz", "50 g") sort by their number; anything else ("Travel size", "Set") keeps the order typed in Sanity. */
const sizeNumber = (s: string) => {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*(ml|g|oz|l|kg)?$/i)
  return m ? Number(m[1]) : null
}

/**
 * Every size the product is sold in for one colour. The product's own "Sizes" list is the source of truth, so a size
 * never disappears just because it has no "Stock by size" row; a row only matters when it ticks "Sold out".
 * Rows for sizes that are not in the product list are kept too, so nothing configured in Sanity is hidden.
 */
export function sizesForColor(
  productSizes?: (string | null)[] | null,
  entries?: ({ size?: string | null; soldOut?: boolean | null } | null)[] | null
): SizeOption[] {
  // Sanity answers `null` (not an empty list) for an array field nobody filled in, so never trust these to be arrays.
  const soldOut = new Map<string, boolean>()
  for (const e of Array.isArray(entries) ? entries : []) {
    const size = String(e?.size || "").trim()
    if (size) soldOut.set(size, !!e?.soldOut || !!soldOut.get(size))
  }
  const own = (Array.isArray(productSizes) ? productSizes : []).map((x) => String(x ?? "").trim()).filter(Boolean)
  const names = [...new Set([...own, ...soldOut.keys()])]
  if (names.every((n) => sizeNumber(n) !== null)) names.sort((a, b) => (sizeNumber(a) as number) - (sizeNumber(b) as number))
  return names.map((size) => ({ size, soldOut: !!soldOut.get(size) }))
}

export function normalizeProduct(raw: RawProduct): ShopProduct {
  const sizes = (Array.isArray(raw.sizes) ? raw.sizes : []).filter((x): x is string => !!x)
  const colors: ColorOption[] = (Array.isArray(raw.colors) ? raw.colors : []).filter((c): c is RawColor => !!c).map((c) => {
    const list = sizesForColor(sizes, c.entries)
    const allOut = list.length > 0 && list.every((s) => s.soldOut)
    return {
      name: String(c.name || ""),
      hex: c.hex || undefined,
      soldOut: !!c.soldOut || allOut,
      images: Array.isArray(c.images) ? c.images.filter(Boolean) : [],
      sizes: list,
    }
  })
  const lead = colors.find((c) => !c.soldOut) || colors[0]
  return {
    _id: raw._id,
    name: raw.name || "",
    price: Number(raw.price || 0),
    originalPrice: raw.originalPrice ?? undefined,
    badge: raw.badge || undefined,
    description: raw.description || undefined,
    category: raw.category || undefined,
    categoryId: raw.categoryId || undefined,
    image: lead?.images[0],
    images: lead?.images || [],
    sizes,
    sizeGuide: Array.isArray(raw.sizeGuide) ? raw.sizeGuide.filter(Boolean) : [],
    skinTypes: (Array.isArray(raw.skinTypes) ? raw.skinTypes : []).filter((x): x is string => !!x),
    ingredients: raw.ingredients || undefined,
    howToUse: raw.howToUse || undefined,
    colors,
    inStock: colors.length ? colors.some((c) => !c.soldOut) : true,
  }
}

/** Server-side check that the chosen variant ("colors" in the data) / size exists and is not sold out. Returns an error code or null. */
export function checkVariant(p: ShopProduct, color: string, size: string): "color" | "size" | "soldout" | null {
  if (!p.colors.length) return null
  const c = p.colors.find((x) => x.name === color)
  if (!c) return "color"
  if (c.soldOut) return "soldout"
  if (c.sizes.length) {
    const s = c.sizes.find((x) => x.size === size)
    if (!s) return "size"
    if (s.soldOut) return "soldout"
  }
  return null
}
