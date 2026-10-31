import { NextResponse, after } from "next/server"
import { client } from "@/sanity/client"
import { PRODUCT_FIELDS, checkVariant, normalizeProduct } from "@/lib/products"
import { applyCoupon } from "@/lib/coupon"
import { clientIp } from "@/lib/admin-auth"
import { notifyOrder } from "@/lib/notify"
import { normalizePhone, parseLookup } from "@/lib/order-lookup"
import { db } from "@/lib/supabase"
import { buildOrderEdit } from "@/lib/order-edit"
import { withItemImages } from "@/lib/item-images"
import { fetchCosts, withCost } from "@/lib/profit"
import { limited } from "@/app/lib/rate-limit"

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })
const NO_DB = () => bad("Supabase configuration is missing.", 500)
const noStore = { headers: { "Cache-Control": "no-store" } }
const shippingFees = () => client.fetch(`*[_type=="shippingSettings"][0].governorates[]{name,feeEgp}`)

// What a customer is allowed to see: first name, items, totals, status. Never phone or address.
const PUBLIC_COLUMNS = "id,name,items,subtotal,shipping,discount,total,status,created_at"
// Only these item fields leave the server — `cost` is YOUR purchase price and must never reach a customer.
const publicItem = (l: any) => ({ id: l?.id, name: l?.name, size: l?.size, color: l?.color, qty: l?.qty, price: l?.price })
const publicOrder = (o: any) => ({
  id: o.id,
  name: String(o.name || "").split(" ")[0],
  items: Array.isArray(o.items) ? o.items.map(publicItem) : [],
  subtotal: o.subtotal,
  shipping: o.shipping,
  discount: o.discount,
  total: o.total,
  status: o.status,
  created_at: o.created_at,
})

/**
 * GET /api/orders?q=TULIP-123456  → that order
 * GET /api/orders?q=01XXXXXXXXX  → every order placed with that phone (newest first)
 * Always the public customer view — the admin dashboard has its own endpoint (/api/admin/orders).
 */
export async function GET(req: Request) {
  if (await limited(`lookup:${clientIp(req)}`, 20)) return bad("Too many requests. Please try again shortly.", 429)
  const q = parseLookup(new URL(req.url).searchParams.get("q") || "")
  if (!q) return bad("Enter your order number (e.g. TULIP-123456) or the phone number used for the order.")
  const sb = db()
  if (!sb) return NO_DB()

  if (q.type === "phone") {
    const { data, error } = await sb
      .from("orders")
      .select(PUBLIC_COLUMNS)
      .eq("phone", q.value)
      .order("created_at", { ascending: false })
      .limit(20)
    if (error) return bad("Could not search orders. Please try again.", 500)
    if (!data?.length) return bad("No orders found for this phone number.", 404)
    const orders = await withItemImages(data.map(publicOrder))
    return NextResponse.json({ orders, order: orders[0], matchedBy: "phone" }, noStore)
  }

  const { data, error } = await sb.from("orders").select(PUBLIC_COLUMNS).in("id", q.candidates).limit(1)
  if (error) return bad("Could not search orders. Please try again.", 500)
  if (!data?.length) return bad("Order not found. Check the number and try again.", 404)
  const order = (await withItemImages([publicOrder(data[0])]))[0]
  return NextResponse.json({ orders: [order], order, matchedBy: "id" }, noStore)
}

/** Customer actions (need order number + the phone used at checkout): cancel, or edit items / delivery details. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return bad("Invalid request")
  const id = String(body.id || "").trim()
  const phone = normalizePhone(String(body.phone || ""))
  if (!id || !phone) return bad("Enter the phone number used for this order.", 401)
  if (await limited(`patch:${clientIp(req)}`, 15)) return bad("Too many requests.", 429)
  const sb = db()
  if (!sb) return NO_DB()

  if (body.action === "edit_order" || body.action === "edit_delivery") {
    const address = body.address === undefined ? "" : String(body.address).trim()
    const governorate = body.governorate === undefined ? "" : String(body.governorate).trim()
    const cur = await sb.from("orders").select("*").eq("id", id).eq("phone", phone).in("status", ["new", "confirmed"]).maybeSingle()
    if (cur.error || !cur.data) return bad("This order can no longer be edited, or the phone number doesn't match.", 409)
    if (body.action === "edit_delivery" && (!address || !governorate)) return bad("Address and governorate are required.")
    const built = await buildOrderEdit(sb, cur.data, {
      items: body.action === "edit_order" ? body.items : undefined,
      governorate: governorate || undefined,
    })
    if ("error" in built) return bad(built.error, built.status)
    if (address) built.patch.address = address
    const { data, error } = await sb.rpc("update_order_atomic", { p_id: id, p_phone: phone, p_patch: built.patch })
    if (error)
      return bad(
        error.message.includes("NOT_ALLOWED") || error.message.includes("NOT_FOUND")
          ? "This order can no longer be edited."
          : "Could not update the order. Please try again.",
        409
      )
    const { phone: _p, address: _a, ...safe } = data as any
    return NextResponse.json({ order: (await withItemImages([publicOrder(safe)]))[0] })
  }

  if (String(body.status || "") !== "cancelled") return bad("Unsupported action.")
  // Atomic: marks cancelled + restores stock + releases the coupon.
  const { data, error } = await sb.rpc("cancel_order_atomic", { p_id: id, p_phone: phone })
  if (error)
    return bad(
      error.message.includes("NOT_ALLOWED") || error.message.includes("NOT_FOUND")
        ? "This order can no longer be cancelled, or the phone number doesn't match."
        : "Could not cancel order.",
      409
    )
  if (!data) return bad("Could not cancel order.", 500)
  after(() =>
    notifyOrder("cancelled", {
      id,
      name: data.name,
      phone: data.phone,
      address: data.address,
      governorate: data.governorate,
      total: Number(data.total),
      items: data.items || [],
    })
  )
  return NextResponse.json({ order: (await withItemImages([publicOrder(data)]))[0] })
}

export async function POST(req: Request) {
  if (await limited(`order:${clientIp(req)}`, 5)) return bad("Too many orders. Please try again shortly.", 429)
  const b = await req.json().catch(() => null)
  if (!b) return bad("Invalid request")
  const name = String(b.name || "").trim()
  const phone = normalizePhone(String(b.phone || ""))
  const address = String(b.address || "").trim()
  const governorate = String(b.governorate || "").trim()
  if (
    !name ||
    !address ||
    !governorate ||
    !phone ||
    !Array.isArray(b.items) ||
    !b.items.length ||
    b.items.length > 30
  )
    return bad("Please check your name, phone, address and governorate.")

  const rawProducts = await client.fetch(`*[_type=="product" && _id in $ids]{${PRODUCT_FIELDS}}`, {
    ids: b.items.map((i: any) => String(i.id)),
  })
  const products = rawProducts.map(normalizeProduct)
  const merged = new Map<string, any>()
  for (const i of b.items) {
    const p = products.find((x: any) => x._id === String(i.id))
    const qty = Math.min(Math.max(parseInt(i.qty) || 0, 0), 10)
    const size = String(i.size || ""),
      color = String(i.color || "")
    if (!p || !qty || checkVariant(p, color, size)) return bad("An item in your cart is no longer available.")
    const k = `${p._id}|${size}|${color}`
    const prev = merged.get(k)
    merged.set(
      k,
      prev
        ? { ...prev, qty: Math.min(prev.qty + qty, 10) }
        : { id: p._id, name: p.name, size, color, qty, price: p.price }
    )
  }
  const costs = await fetchCosts([...merged.values()].map((l) => l.id))
  const lines = [...merged.values()].map((l) => withCost(l, costs))
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const cp: any = await applyCoupon(b.coupon, subtotal, phone)
  if (cp.error) return bad(cp.error)
  const fee = ((await shippingFees()) || []).find((f: any) => f.name === governorate)?.feeEgp
  const shipping = Number(fee)
  if (fee == null || !Number.isFinite(shipping)) return bad("This governorate is not available for delivery.")
  const total = subtotal - cp.discount + shipping

  const sb = db()
  if (!sb) return NO_DB()
  const { data, error } = await sb.rpc("create_order_atomic", {
    payload: {
      name,
      phone,
      address,
      governorate,
      payment: "cod",
      items: lines,
      subtotal,
      shipping,
      discount: cp.discount,
      coupon: cp.code,
      total,
    },
    coupon_id: cp.couponId || null,
    coupon_phone: phone,
  })
  if (error) {
    const m = error.message || ""
    console.error("create_order_atomic failed:", error)
    const known = m.includes("COUPON_LIMIT")
    const text = m.includes("COUPON_LIMIT")
      ? "This coupon is no longer available."
      : "Could not save your order. Please try again."
    const detail = process.env.NODE_ENV === "production" || known ? "" : ` [${m}]`
    return bad(text + detail, known ? 409 : 500)
  }
  after(() => notifyOrder("new", { id: String(data), name, phone, address, governorate, total, items: lines }))
  return NextResponse.json({ orderId: data })
}
