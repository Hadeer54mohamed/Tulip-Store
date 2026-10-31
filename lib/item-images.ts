import { client, img } from "@/sanity/client"

type Line = { id?: unknown; color?: unknown; image?: string; [k: string]: unknown }
type WithItems = { items?: unknown; [k: string]: unknown }

/**
 * Adds `image` (a small thumbnail URL) to every product line of the given orders, so the admin — and the customer on
 * the tracking page — can see WHAT was ordered. Orders only store ids/names/colours, so the picture is looked up in
 * Sanity by product id and colour at read time. It never throws: if Sanity is unreachable the orders come back as-is.
 */
export async function withItemImages<T extends WithItems>(orders: T[]): Promise<T[]> {
  const ids = new Set<string>()
  for (const o of orders) for (const l of (Array.isArray(o.items) ? o.items : []) as Line[]) if (l?.id) ids.add(String(l.id))
  if (!ids.size) return orders
  try {
    const products: { _id: string; colors?: { name?: string; image?: unknown }[] }[] = await client.fetch(
      `*[_type=="product" && _id in $ids]{_id,"colors":colors[]{name,"image":images[0]}}`,
      { ids: [...ids] }
    )
    const byProduct = new Map(products.map((p) => [p._id, p.colors || []]))
    const thumb = (source: unknown) => (source ? img(source, 160) : "")
    return orders.map((o) => ({
      ...o,
      items: (Array.isArray(o.items) ? (o.items as Line[]) : []).map((l) => {
        const colors = byProduct.get(String(l?.id)) || []
        const hit = colors.find((c) => c.name === l?.color && c.image) || colors.find((c) => c.image)
        const image = thumb(hit?.image)
        return image ? { ...l, image } : l
      }),
    }))
  } catch {
    return orders
  }
}
