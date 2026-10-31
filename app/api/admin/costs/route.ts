import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/supabase"
import { fetchCosts, withCost } from "@/lib/profit"

const err = (error: string, status = 400) => NextResponse.json({ error }, { status })
const hasCost = (l: any) => typeof l?.cost === "number" && Number.isFinite(l.cost)

/**
 * Orders placed before profit tracking have no cost saved. This fills them in from the product's CURRENT cost in
 * Sanity (only lines that have none — saved costs are never overwritten). Safe to press again.
 */
export async function POST(req: Request) {
  if (!isAdmin(req)) return err("Unauthorized", 401)
  const sb = db()
  if (!sb) return err("Supabase configuration is missing.", 500)

  const { data, error } = await sb.from("orders").select("id,items").neq("status", "cancelled").order("created_at", { ascending: false }).limit(2000)
  if (error) return err("Could not read orders.", 500)
  const todo = (data || []).filter((o) => Array.isArray(o.items) && o.items.some((l: any) => !hasCost(l)))
  if (!todo.length) return NextResponse.json({ updated: 0, stillMissing: 0 })

  const costs = await fetchCosts(todo.flatMap((o) => (o.items as any[]).map((l) => String(l?.id))))
  let updated = 0
  let stillMissing = 0
  for (const o of todo) {
    const items = (o.items as any[]).map((l) => (hasCost(l) ? l : withCost(l, costs)))
    if (items.some((l) => !hasCost(l))) stillMissing++
    if (items.every((l, i) => l === (o.items as any[])[i])) continue
    const { error: e } = await sb.from("orders").update({ items }).eq("id", o.id).neq("status", "cancelled")
    if (!e) updated++
  }
  return NextResponse.json({ updated, stillMissing })
}
