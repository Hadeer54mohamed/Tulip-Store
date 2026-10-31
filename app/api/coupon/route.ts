import { NextResponse } from "next/server"
import { applyCoupon } from "@/lib/coupon"
import { limited } from "@/app/lib/rate-limit"

export async function POST(request: Request) {
  const clientKey = request.headers.get("x-forwarded-for") || "anonymous"
  if (await limited(`coupon:${clientKey}`, 10))
    return NextResponse.json({ error: "Too many coupon attempts. Please try again shortly." }, { status: 429 })
  try {
    const body = await request.json()
    const subtotal = Number(body.subtotal)
    if (!Number.isFinite(subtotal) || subtotal < 0)
      return NextResponse.json({ error: "Invalid subtotal" }, { status: 400 })
    const result = await applyCoupon(String(body.code || ""), subtotal, String(body.phone || "").trim() || undefined)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ discount: result.discount, code: result.code })
  } catch {
    return NextResponse.json({ error: "Unable to apply coupon" }, { status: 400 })
  }
}
