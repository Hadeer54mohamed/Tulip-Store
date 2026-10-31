import type { SupabaseClient } from "@supabase/supabase-js"
import { client } from "@/sanity/client"
import { PRODUCT_FIELDS, checkVariant, normalizeProduct } from "@/lib/products"
import { discountFor } from "@/lib/coupon"
import { fetchCosts, withCost } from "@/lib/profit"

export type StoredLine = { id: string; name: string; size: string; color: string; qty: number; price: number; cost?: number }
export type EditableOrder = {
  items?: unknown
  subtotal?: unknown
  discount?: unknown
  shipping?: unknown
  coupon?: string | null
  governorate?: string | null
}
export type EditResult = { error: string; status: number } | { patch: Record<string, unknown> }

const lineKey = (l: { id: string; size?: string; color?: string }) => `${l.id}|${l.size || ""}|${l.color || ""}`
const toStored = (raw: unknown): StoredLine[] =>
  (Array.isArray(raw) ? raw : []).map((l: any): StoredLine => ({
    id: String(l.id),
    name: String(l.name || ""),
    size: String(l.size || ""),
    color: String(l.color || ""),
    qty: Number(l.qty) || 0,
    price: Number(l.price) || 0,
    // keep the cost that was saved when the order was placed
    ...(typeof l.cost === "number" && Number.isFinite(l.cost) ? { cost: l.cost } : {}),
  }))

/**
 * Works out the new items / totals for an order edit. Existing lines keep the price the customer saw;
 * a line that is new (or whose quantity goes up) is checked against Sanity and uses today's price.
 * `requested` is the full list of lines the order should end up with (qty 0 / missing = removed).
 */
export async function buildOrderEdit(
  sb: SupabaseClient,
  order: EditableOrder,
  opts: { items?: unknown; governorate?: string }
): Promise<EditResult> {
  const patch: Record<string, unknown> = {}
  const current = toStored(order.items)
  const currentByKey = new Map(current.map((l) => [lineKey(l), l]))
  let lines = current

  if (opts.items !== undefined) {
    if (!Array.isArray(opts.items) || opts.items.length > 30) return { error: "Invalid items.", status: 400 }
    const wanted = new Map<string, { id: string; size: string; color: string; qty: number }>()
    for (const raw of opts.items as any[]) {
      const id = String(raw?.id || "").trim()
      const qty = Math.min(parseInt(raw?.qty) || 0, 10)
      if (!id || qty < 1) continue
      const line = { id, size: String(raw?.size || ""), color: String(raw?.color || ""), qty }
      const k = lineKey(line)
      const prev = wanted.get(k)
      wanted.set(k, prev ? { ...prev, qty: Math.min(prev.qty + qty, 10) } : line)
    }
    if (!wanted.size) return { error: "An order needs at least one item. Cancel the order instead.", status: 400 }

    const needCheck = [...wanted.entries()].filter(([k, l]) => !currentByKey.has(k) || l.qty > (currentByKey.get(k)?.qty || 0))
    const ids = [...new Set([...wanted.values()].map((l) => l.id))]
    const rawProducts: any[] = ids.length
      ? await client.fetch(`*[_type=="product" && _id in $ids]{${PRODUCT_FIELDS}}`, { ids })
      : []
    const products = rawProducts.map(normalizeProduct)

    for (const [k, l] of needCheck) {
      const p = products.find((x) => x._id === l.id)
      if (!p || checkVariant(p, l.color, l.size))
        return {
          error: `${p?.name || "An item"}${l.color ? ` · ${l.color}` : ""}${l.size ? ` · ${l.size}` : ""} isn't available right now.`,
          status: 409,
        }
    }
    const newIds = [...wanted.entries()].filter(([k]) => !currentByKey.has(k)).map(([, l]) => l.id)
    const costs = await fetchCosts(newIds)
    lines = [...wanted.entries()].map(([k, l]): StoredLine => {
      const existing = currentByKey.get(k)
      if (existing) return { ...existing, qty: l.qty }
      const p = products.find((x) => x._id === l.id)!
      return withCost({ id: l.id, name: p.name, size: l.size, color: l.color, qty: l.qty, price: p.price }, costs)
    })
    patch.items = lines
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  let discount = Math.min(Number(order.discount || 0), subtotal)
  if (opts.items !== undefined && order.coupon) {
    const { data: coupon } = await sb
      .from("coupons")
      .select("kind,value,minimum_order")
      .eq("code", order.coupon)
      .maybeSingle()
    if (coupon) discount = discountFor(coupon, subtotal)
  }

  let shipping = Number(order.shipping || 0)
  if (opts.governorate && opts.governorate !== order.governorate) {
    const fees: { name: string; feeEgp: number }[] =
      (await client.fetch(`*[_type=="shippingSettings"][0].governorates[]{name,feeEgp}`)) || []
    const row = fees.find((f) => f.name === opts.governorate)
    if (!row) return { error: "This governorate is not available for delivery.", status: 400 }
    shipping = Number(row.feeEgp || 0)
    patch.governorate = opts.governorate
  }

  patch.subtotal = subtotal
  patch.discount = discount
  patch.shipping = shipping
  patch.total = subtotal - discount + shipping
  return { patch }
}
