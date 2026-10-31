import { NextResponse } from "next/server"
import { db } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
function auth(request: Request) {
  return isAdmin(request)
}
export async function GET(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const sb = db()
  if (!sb) return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 500 })
  const { data, error } = await sb.from("coupons").select("*").order("created_at", { ascending: false })
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ coupons: data || [] })
}
export async function POST(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const sb = db()
  if (!sb || !body?.code || !["percentage", "fixed"].includes(body.kind))
    return NextResponse.json({ error: "Invalid coupon or storage configuration." }, { status: 400 })
  const { data, error } = await sb
    .from("coupons")
    .insert({
      code: String(body.code).trim().toUpperCase(),
      kind: body.kind,
      value: Number(body.value),
      minimum_order: Number(body.minimum_order || 0),
      max_uses: body.max_uses ? Number(body.max_uses) : null,
      // A date like 2026-10-10 means the END of that day in Cairo, not its first second.
      expires_at: /^\d{4}-\d{2}-\d{2}$/.test(String(body.expires_at || ""))
        ? `${body.expires_at}T23:59:59+03:00`
        : body.expires_at || null,
      active: body.active !== false,
    })
    .select("*")
    .single()
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ coupon: data })
}
export async function PATCH(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const sb = db()
  if (!sb || !body?.id) return NextResponse.json({ error: "Invalid coupon." }, { status: 400 })
  const { data, error } = await sb
    .from("coupons")
    .update({ active: Boolean(body.active) })
    .eq("id", body.id)
    .select("*")
    .single()
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ coupon: data })
}
