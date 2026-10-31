import { db as storage } from "@/lib/supabase"
import { fmt } from "@/lib/format"

export async function applyCoupon(code: string | undefined, subtotal: number, customerPhone?: string) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase()
  if (!normalized) return { discount: 0, code: null }
  const sb = storage()
  if (!sb) return { discount: 0, code: null, error: "Coupon storage is not configured." }
  const { data: coupon, error } = await sb
    .from("coupons")
    .select("id,code,kind,value,minimum_order,max_uses,used_count,expires_at,active")
    .eq("code", normalized)
    .maybeSingle()
  if (error || !coupon || !coupon.active) return { discount: 0, code: null, error: "Coupon code is not valid." }
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date())
    return { discount: 0, code: null, error: "This coupon has expired." }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses)
    return { discount: 0, code: null, error: "This coupon has reached its usage limit." }
  if (subtotal < Number(coupon.minimum_order || 0))
    return { discount: 0, code: null, error: `Minimum order is ${fmt(Number(coupon.minimum_order))} EGP.` }
  if (customerPhone) {
    const { data: used } = await sb
      .from("coupon_usages")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("customer_phone", customerPhone)
      .maybeSingle()
    if (used) return { discount: 0, code: null, error: "This coupon was already used for this phone number." }
  }
  return { discount: discountFor(coupon, subtotal), code: coupon.code, couponId: coupon.id }
}

type CouponRule = { kind: string; value: unknown; minimum_order?: unknown }

/** Discount a coupon gives on a subtotal (0 when the minimum order is no longer met). Never more than the subtotal. */
export function discountFor(coupon: CouponRule, subtotal: number) {
  if (subtotal < Number(coupon.minimum_order || 0)) return 0
  const raw = coupon.kind === "percentage" ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value)
  return Math.min(Math.max(Math.round(raw), 0), subtotal)
}
