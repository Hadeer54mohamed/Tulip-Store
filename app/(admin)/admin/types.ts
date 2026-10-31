export type OrderItem = { id?: string; name?: string; qty?: number; price?: number; size?: string; color?: string; image?: string }

export type Order = {
  id: string
  name?: string
  phone?: string
  address?: string
  governorate?: string
  payment?: string
  items?: OrderItem[]
  subtotal?: number
  shipping?: number
  discount?: number
  coupon?: string | null
  total?: number
  status?: string
  created_at?: string
}

export type Stats = {
  total: number
  counts: Record<string, number>
  revenue: number
  monthRevenue: number
  todayRevenue: number
  todayOrders: number
  /** profit = sales − product cost (orders whose cost is fully known) */
  profit?: number
  monthProfit?: number
  todayProfit?: number
  /** orders (not cancelled) that have no cost saved, so they're left out of the profit */
  costMissing?: number
  topProducts: { name: string; units: number; revenue: number }[]
}

export const STATUSES = ["new", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export const egp = (n: unknown) => {
  const v = Math.round(Number(n || 0))
  return `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("en-US")} EGP`
}

export const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        timeZone: "Africa/Cairo",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

export const fmtShortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "2-digit", month: "short" }) : "—"

export async function readJson<T = any>(res: Response): Promise<T & { error?: string }> {
  const raw = await res.text()
  try {
    return raw ? JSON.parse(raw) : ({} as any)
  } catch {
    return {} as any
  }
}
