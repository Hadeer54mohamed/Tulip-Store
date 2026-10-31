import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/supabase"
import { normalizePhone, orderIdCandidates, safeSearchText } from "@/lib/order-lookup"
import { buildOrderEdit } from "@/lib/order-edit"
import { withItemImages } from "@/lib/item-images"

const STATUSES = ["new", "confirmed", "processing", "shipped", "delivered", "cancelled"]
const DEFAULT_PAGE_SIZE = 8
const err = (error: string, status = 400) => NextResponse.json({ error }, { status })
const noStore = { headers: { "Cache-Control": "no-store" } }

/**
 * Admin order list. Search and filters run in the database, so ANY order can be found — not only the latest ones.
 * ?q=  order number / name / phone / address     ?status=new|confirmed|…|all     ?page=1
 * ?stats=1 also returns the dashboard numbers.
 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return err("Unauthorized", 401)
  const sb = db()
  if (!sb) return err("Supabase configuration is missing.", 500)

  const url = new URL(req.url)
  // Lightweight "am I signed in?" check used when the dashboard opens.
  if (url.searchParams.get("check") === "1") return NextResponse.json({ ok: true }, noStore)
  const status = url.searchParams.get("status") || "all"
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "") || DEFAULT_PAGE_SIZE))
  const text = safeSearchText(url.searchParams.get("q") || "")

  let query = sb.from("orders").select("*", { count: "exact" })
  if (STATUSES.includes(status)) query = query.eq("status", status)
  if (text) {
    const ors = new Set<string>([`name.ilike.%${text}%`, `address.ilike.%${text}%`, `id.ilike.%${text}%`])
    for (const c of orderIdCandidates(text)) ors.add(`id.ilike.%${c}%`)
    const digits = text.replace(/\D/g, "")
    const phone = normalizePhone(text)
    if (phone) ors.add(`phone.eq.${phone}`)
    if (digits.length >= 3) ors.add(`phone.ilike.%${digits}%`)
    query = query.or([...ors].join(","))
  }
  const from = (page - 1) * pageSize
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1)
  if (error) return err("Could not load orders.", 500)

  let stats: unknown = null
  if (url.searchParams.get("stats") === "1") {
    const res = await sb.rpc("admin_order_stats")
    if (res.error) console.error("admin_order_stats failed (did you run the latest migration?):", res.error.message)
    else stats = res.data
  }
  return NextResponse.json(
    { orders: await withItemImages(data || []), total: count ?? 0, page, pageSize, stats },
    noStore
  )
}

/** Admin: edit an order (action "edit") or move it to another stage. Cancelling gives the coupon use back. */
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return err("Unauthorized", 401)
  const body = await req.json().catch(() => null)
  const id = String(body?.id || "").trim()
  if (!id) return err("Invalid order")
  const sb = db()
  if (!sb) return err("Supabase configuration is missing.", 500)

  if (body.action === "edit") {
    const cur = await sb.from("orders").select("*").eq("id", id).maybeSingle()
    if (cur.error) return err("Could not load the order.", 500)
    if (!cur.data) return err("Order not found.", 404)
    if (["cancelled", "delivered"].includes(cur.data.status)) return err("Cancelled or delivered orders can't be edited.", 409)

    const built = await buildOrderEdit(sb, cur.data, {
      items: body.items,
      governorate: body.governorate === undefined ? undefined : String(body.governorate).trim(),
    })
    if ("error" in built) return err(built.error, built.status)
    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) return err("Customer name can't be empty.")
      built.patch.name = name
    }
    if (body.phone !== undefined) {
      const phone = normalizePhone(String(body.phone))
      if (!phone) return err("Enter a valid Egyptian mobile number (01XXXXXXXXX).")
      built.patch.phone = phone
    }
    if (body.address !== undefined) {
      const address = String(body.address).trim()
      if (!address) return err("Address can't be empty.")
      built.patch.address = address
    }
    const { data, error } = await sb.rpc("update_order_atomic", { p_id: id, p_phone: null, p_patch: built.patch })
    if (error)
      return err(
        error.message.includes("NOT_ALLOWED") ? "Cancelled or delivered orders can't be edited." : "Could not update the order.",
        409
      )
    return NextResponse.json({ order: (await withItemImages([data]))[0] })
  }

  const status = String(body.status || "").trim()
  if (!STATUSES.includes(status)) return err("Invalid order status")

  if (status === "cancelled") {
    const { data, error } = await sb.rpc("cancel_order_atomic", { p_id: id, p_phone: null })
    if (error)
      return err(
        error.message.includes("NOT_ALLOWED")
          ? "Delivered orders can't be cancelled."
          : error.message.includes("NOT_FOUND")
            ? "Order not found."
            : "Could not cancel order.",
        409
      )
    return NextResponse.json({ order: (await withItemImages([data]))[0] })
  }
  // A cancelled order can't be re-opened (use a new order instead).
  const { data, error } = await sb
    .from("orders")
    .update({ status })
    .eq("id", id)
    .neq("status", "cancelled")
    .select("*")
    .maybeSingle()
  if (error) return err("Could not update order.", 500)
  if (!data) return err("This order is cancelled (or no longer exists) and can't be changed.", 409)
  return NextResponse.json({ order: (await withItemImages([data]))[0] })
}

/** Admin: delete an order permanently (it disappears from the database; a live order gives its coupon use back). */
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return err("Unauthorized", 401)
  const body = await req.json().catch(() => null)
  const id = String(body?.id || "").trim()
  if (!id) return err("Invalid order")
  const sb = db()
  if (!sb) return err("Supabase configuration is missing.", 500)
  const { error } = await sb.rpc("delete_order_atomic", { p_id: id })
  if (error) return err(error.message.includes("NOT_FOUND") ? "Order not found (already deleted?)." : "Could not delete the order.", error.message.includes("NOT_FOUND") ? 404 : 500)
  return NextResponse.json({ ok: true })
}
