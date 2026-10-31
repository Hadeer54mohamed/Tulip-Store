"use client"

import { useEffect, useState } from "react"
import { useCart } from "@/app/context/CartContext"
import { fmt } from "@/lib/format"

type ShippingSetting = { name: string; feeEgp: number }
type FormState = { name: string; phone: string; address: string; governorate: string; payment: "cod" }

export default function CartPage() {
  const { items, remove, updateQty, clear } = useCart()
  const [form, setForm] = useState<FormState>({ name: "", phone: "", address: "", governorate: "", payment: "cod" })
  const [shippingSettings, setShippingSettings] = useState<ShippingSetting[]>([])
  const [code, setCode] = useState("")
  useEffect(() => {
    fetch("/api/shipping", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setShippingSettings(Array.isArray(data.settings) ? data.settings : []))
      .catch(() => setShippingSettings([]))
  }, [])
  const [discount, setDiscount] = useState(0)
  const [status, setStatus] = useState<{ busy: boolean; error: string; orderId: string | null }>({
    busy: false,
    error: "",
    orderId: null,
  })
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  useEffect(() => {
    setDiscount(0)
  }, [subtotal])
  const shipping = shippingSettings.find((setting) => setting.name === form.governorate)?.feeEgp ?? 0
  const total = subtotal - discount + shipping
  const update =
    (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }))

  async function applyCoupon() {
    const response = await fetch("/api/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal, phone: form.phone.trim() }),
    })
    const raw = await response.text()
    let data: { discount?: number; error?: string } = {}
    try {
      data = raw ? JSON.parse(raw) : {}
    } catch {
      data = {}
    }
    setDiscount(response.ok ? Number(data.discount || 0) : 0)
    if (!response.ok)
      setStatus((current) => ({ ...current, error: data.error || `Could not apply coupon (${response.status})` }))
    else setStatus((current) => ({ ...current, error: "" }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setStatus({ busy: true, error: "", orderId: null })
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        payment: "cod",
        coupon: code,
        items: items.map(({ id, size, color, qty }) => ({ id, size, color, qty })),
      }),
    })
    const raw = await response.text()
    let data: { error?: string; orderId?: string } = {}
    try {
      data = raw ? JSON.parse(raw) : {}
    } catch {
      data = {}
    }
    if (!response.ok || !data.orderId)
      return setStatus({
        busy: false,
        error: data.error || `Could not place order (${response.status})`,
        orderId: null,
      })
    clear()
    setStatus({ busy: false, error: "", orderId: data.orderId })
  }

  if (status.orderId)
    return (
      <main className="cart-shell">
        <div className="success-card">
          <p className="eyebrow">Order confirmed</p>
          <h1 className="cart-title">Thank you.</h1>
          <p>Your order number is</p>
          <p className="order-number">{status.orderId}</p>
          <p>
            We&apos;ve received it and will call you on {form.phone} to confirm delivery. Keep this number — you can use
            it (or your phone number) to track, edit or cancel your order.
          </p>
          <a className="checkout-submit success-link" href={`/track?q=${encodeURIComponent(status.orderId)}`}>
            Track your order
          </a>
        </div>
      </main>
    )
  if (!items.length)
    return (
      <main className="cart-shell">
        <p className="eyebrow">Your cart</p>
        <h1 className="cart-title">It&apos;s quiet here.</h1>
        <div className="empty-state">
          <p>Add a few skincare favourites to get started.</p>
          <a className="text-link" href="/#shop">
            Continue shopping
          </a>
        </div>
      </main>
    )

  return (
    <main className="cart-shell">
      <p className="eyebrow">
        Your cart ({items.length} {items.length === 1 ? "item" : "items"})
      </p>
      <h1 className="cart-title">Almost yours.</h1>
      <div className="cart-grid">
        <section className="cart-list" aria-label="Your shopping cart">
          <div className="section-heading">
            <h2>Your selection</h2>
            <span>{items.length} items</span>
          </div>
          {items.map((item) => (
            <article className="cart-item" key={`${item.id}-${item.size}-${item.color}`}>
              <img className="cart-item-image" src={item.image} alt={item.name} />
              <div className="cart-item-copy">
                <strong>{item.name}</strong>
                <small>{[item.color, item.size].filter(Boolean).join(" · ")}</small>
                <div className="qty-control">
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, item.size, item.qty - 1, item.color)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, item.size, item.qty + 1, item.color)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button className="remove-item" type="button" onClick={() => remove(item.id, item.size, item.color)}>
                  Remove
                </button>
              </div>
              <strong className="cart-item-price">{fmt((item.price * item.qty))} EGP</strong>
            </article>
          ))}
          <a className="text-link continue-link" href="/#shop">
            ← Continue shopping
          </a>
        </section>
        <section className="checkout-card" aria-label="Checkout">
          <div className="checkout-heading">
            <p className="eyebrow">Checkout</p>
            <h2>Delivery details</h2>
          </div>
          <form className="checkout-form" onSubmit={submit}>
            <label>
              Full name
              <input value={form.name} onChange={update("name")} placeholder="Your name" required />
            </label>
            <label>
              Phone number
              <input value={form.phone} onChange={update("phone")} placeholder="01XXXXXXXXX" inputMode="tel" required />
            </label>
            <label>
              Delivery address
              <textarea
                value={form.address}
                onChange={update("address")}
                placeholder="Street, building, apartment"
                rows={3}
                required
              />
            </label>
            <label>
              Governorate
              <select value={form.governorate} onChange={update("governorate")} required>
                <option value="">Select your governorate</option>
                {shippingSettings.map((setting) => (
                  <option key={setting.name} value={setting.name}>
                    {setting.name} · {setting.feeEgp} EGP
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment method
              <input value="Cash on delivery" readOnly aria-readonly="true" />
            </label>
            <div className="coupon-row">
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Coupon code" />
              <button type="button" onClick={applyCoupon}>
                Apply
              </button>
            </div>
            {status.error && (
              <p className="cart-error" role="alert">
                {status.error}
              </p>
            )}
            <div className="checkout-summary">
              <div>
                <span>Subtotal</span>
                <strong>{fmt(subtotal)} EGP</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>{fmt(shipping)} EGP</strong>
              </div>
              {discount > 0 && (
                <div>
                  <span>Discount</span>
                  <strong>-{fmt(discount)} EGP</strong>
                </div>
              )}
              <div className="total-row">
                <span>Total</span>
                <strong>{fmt(total)} EGP</strong>
              </div>
            </div>
            <button className="checkout-submit" type="submit" disabled={status.busy}>
              {status.busy ? "Placing order…" : "Place order"}
            </button>
            <p className="secure-note">Your details are only used to deliver your order.</p>
          </form>
        </section>
      </div>
    </main>
  )
}
