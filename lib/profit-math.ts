/** Pure profit maths (no server imports, so the admin screen can use it too). See lib/profit.ts for how costs are saved. */

type Line = { qty?: unknown; cost?: unknown }
type MoneyOrder = { status?: string | null; subtotal?: unknown; discount?: unknown; items?: unknown }

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const known = (l: Line) => typeof l?.cost === "number" && Number.isFinite(l.cost)

/** Money for ONE order (what the admin shows in the order details). */
export function orderMoney(o: MoneyOrder) {
  const lines: Line[] = Array.isArray(o.items) ? (o.items as Line[]) : []
  const cancelled = o.status === "cancelled"
  const revenue = cancelled ? 0 : Math.max(0, n(o.subtotal) - n(o.discount))
  const complete = lines.length > 0 && lines.every(known)
  const cost = lines.reduce((s, l) => s + (known(l) ? Number(l.cost) * n(l.qty) : 0), 0)
  return { cancelled, revenue, cost, costComplete: complete, profit: cancelled || !complete ? null : revenue - cost }
}
