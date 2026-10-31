import { client } from "@/sanity/client"

/**
 * Profit = what the customer pays for the products (after any coupon) − what those products cost YOU.
 * Shipping is left out on both sides, and cancelled orders count for nothing.
 * The cost of every product is read from Sanity ("Cost (EGP) — Internal") when the order is placed and saved on the
 * order line, so later price/cost changes never rewrite old orders. A line whose product has no cost has no `cost`
 * key and its order is reported as "cost missing" instead of silently counting as 100 % profit.
 */

/** Cost per product id, `null` when the product has no (valid) cost in Sanity. Never throws. */
export async function fetchCosts(ids: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return out
  try {
    const rows: { _id: string; cost?: unknown }[] = await client.fetch(`*[_type=="product" && _id in $ids]{_id,cost}`, { ids: unique })
    for (const r of rows || []) out.set(r._id, typeof r.cost === "number" && Number.isFinite(r.cost) && r.cost >= 0 ? r.cost : null)
  } catch {
    /* Sanity unreachable: lines simply get no cost and show up as "cost missing" */
  }
  return out
}

/** Adds `cost` to a line only when it is known. */
export function withCost<T extends { id: string }>(line: T, costs: Map<string, number | null>): T & { cost?: number } {
  const c = costs.get(line.id)
  return c == null ? line : { ...line, cost: c }
}

export { orderMoney } from "@/lib/profit-math"
