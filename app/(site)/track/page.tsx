"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import Pager from "@/app/components/Pager"
import { paginate, usePageSize } from "@/app/components/usePageSize"
import OrderItemsEditor, { type EditorLine } from "@/app/components/OrderItemsEditor"

type Item = { id?: string; name?: string; qty?: number; price?: number; size?: string; color?: string; image?: string }
type Order = {
  id: string
  name?: string
  status?: string
  total?: number
  subtotal?: number
  shipping?: number
  discount?: number
  created_at?: string
  items?: Item[]
}
type ShippingSetting = { name: string; feeEgp: number }

const STEPS = [
  { key: "new", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Preparing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
]
const LABEL: Record<string, string> = {
  new: "Placed",
  confirmed: "Confirmed",
  processing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
}
const egp = (n: unknown) => `${Number(n || 0).toLocaleString("en-US")} EGP`
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short", year: "numeric" }) : "recently"

async function json(res: Response) {
  const raw = await res.text()
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function TrackPage() {
  const [query, setQuery] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [matchedBy, setMatchedBy] = useState<"phone" | "id" | null>(null)
  const [searched, setSearched] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [shipping, setShipping] = useState<ShippingSetting[]>([])
  const [page, setPage] = useState(1)
  const size = usePageSize()
  const view = paginate(orders, page, size)

  async function find(value: string) {
    const v = value.trim()
    if (!v) return
    setError("")
    setOrders([])
    setPage(1)
    setBusy(true)
    try {
      const res = await fetch(`/api/orders?q=${encodeURIComponent(v)}`, { cache: "no-store" })
      const data = await json(res)
      if (!res.ok || !data.orders?.length) return setError(data.error || "We couldn't find that order.")
      setOrders(data.orders)
      setMatchedBy(data.matchedBy)
      setSearched(v)
      if (!shipping.length)
        fetch("/api/shipping", { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => setShipping(d.settings || []))
          .catch(() => {})
    } catch {
      setError("Network problem. Please check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const q = p.get("q") || p.get("phone") || p.get("id") || ""
    if (q) {
      setQuery(q)
      find(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (updated: Order) => setOrders((list) => list.map((o) => (o.id === updated.id ? { ...o, ...updated, name: o.name } : o)))

  return (
    <main className="utility-page track-page">
      <div className="trk-shell">
        <p className="eyebrow">Order care</p>
        <h1 className="trk-title">Track your order</h1>
        <p className="trk-lead">Enter your order number (like TULIP-123456) or the phone number you used at checkout.</p>

        <form
          className="trk-search"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            find(query)
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="TULIP-123456 or 01XXXXXXXXX"
            aria-label="Order number or phone number"
            autoComplete="off"
            required
          />
          <button className="trk-btn trk-btn-dark" disabled={busy}>
            {busy ? "Searching…" : "Find order"}
          </button>
        </form>

        {error && (
          <p className="trk-error" role="alert">
            {error}
          </p>
        )}

        {orders.length > 1 && <p className="trk-count">{orders.length} orders found for this phone number</p>}

        <div className="trk-list">
          {view.slice.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              matchedBy={matchedBy}
              searchedPhone={matchedBy === "phone" ? searched : ""}
              shipping={shipping}
              onUpdated={update}
            />
          ))}
        </div>

        <Pager page={view.page} pages={view.pages} onChange={setPage} label="orders" />

        <Link href="/" className="trk-back">
          ← Continue shopping
        </Link>
      </div>
    </main>
  )
}

function OrderCard({
  order,
  matchedBy,
  searchedPhone,
  shipping,
  onUpdated,
}: {
  order: Order
  matchedBy: "phone" | "id" | null
  searchedPhone: string
  shipping: ShippingSetting[]
  onUpdated: (o: Order) => void
}) {
  const status = order.status || "new"
  const manageable = status === "new" || status === "confirmed"
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(searchedPhone)
  const [address, setAddress] = useState("")
  const [governorate, setGovernorate] = useState("")
  const [lines, setLines] = useState<EditorLine[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const current = Math.max(0, STEPS.findIndex((s) => s.key === status))

  function startEdit() {
    setLines(
      (order.items || []).map((it) => ({
        id: String(it.id || ""),
        name: it.name || "",
        size: it.size || "",
        color: it.color || "",
        qty: Number(it.qty) || 1,
        price: Number(it.price) || 0,
        image: it.image,
      }))
    )
    setAddress("")
    setGovernorate("")
    setMsg(null)
    setEditing(true)
  }

  async function patch(body: object, fallback: string, done: string) {
    if (!phone.trim()) return setMsg({ ok: false, text: "Enter the phone number you used for this order." })
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: order.id, phone, ...body }),
      })
      const data = await json(res)
      if (!res.ok || !data.order) return setMsg({ ok: false, text: data.error || fallback })
      onUpdated(data.order)
      setEditing(false)
      setMsg({ ok: true, text: done })
    } catch {
      setMsg({ ok: false, text: "Network problem. Please try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="trk-card">
      <header className="trk-card-head">
        <div>
          <span className="trk-eyebrow">Order</span>
          <h2>{order.id}</h2>
          <p>
            {order.name ? `Thank you, ${order.name}. ` : ""}Placed {when(order.created_at)}
          </p>
        </div>
        <span className={`trk-pill trk-${status}`}>{LABEL[status] || status}</span>
      </header>

      {status === "cancelled" ? (
        <p className="trk-error">This order was cancelled.</p>
      ) : (
        <ol className="trk-steps" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className={i < current ? "is-done" : i === current ? "is-current" : ""}>
              <span>{i < current ? "✓" : i + 1}</span>
              <small>{s.label}</small>
            </li>
          ))}
        </ol>
      )}

      {order.items?.length ? (
        <div className="trk-items">
          {order.items.map((item, i) => (
            <div key={`${item.name}-${i}`}>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="trk-photo" src={item.image} alt={item.name || ""} loading="lazy" />
              ) : null}
              <span className="trk-item-info">
                {item.name || "Product"} × {item.qty || 1}
                <small>{[item.color, item.size].filter(Boolean).join(" · ")}</small>
              </span>
              <b>{egp(Number(item.price || 0) * Number(item.qty || 1))}</b>
            </div>
          ))}
        </div>
      ) : null}

      <div className="trk-totals">
        <div>
          <span>Subtotal</span>
          <b>{egp(order.subtotal)}</b>
        </div>
        {Number(order.discount) > 0 && (
          <div>
            <span>Discount</span>
            <b>−{egp(order.discount)}</b>
          </div>
        )}
        <div>
          <span>Shipping</span>
          <b>{egp(order.shipping)}</b>
        </div>
        <div className="trk-total">
          <span>Total (cash on delivery)</span>
          <b>{egp(order.total)}</b>
        </div>
      </div>

      {manageable && (
        <div className="trk-manage">
          {!open ? (
            <button className="trk-btn trk-btn-outline" onClick={() => setOpen(true)}>
              Change or cancel this order
            </button>
          ) : (
            <>
              {matchedBy === "id" && (
                <label className="trk-field">
                  Phone number used for this order
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
                  <small>We ask for it so only you can change your order.</small>
                </label>
              )}
              <div className="trk-actions">
                <button className="trk-btn trk-btn-dark" disabled={busy} onClick={() => (editing ? setEditing(false) : startEdit())}>
                  {editing ? "Close editor" : "Edit order"}
                </button>
                <button
                  className="trk-btn trk-btn-danger"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(`Cancel order ${order.id}?`) &&
                    patch({ status: "cancelled" }, "This order can no longer be cancelled.", "Your order was cancelled.")
                  }
                >
                  Cancel order
                </button>
              </div>
              {editing && (
                <form
                  className="trk-edit"
                  onSubmit={(e) => {
                    e.preventDefault()
                    patch(
                      {
                        action: "edit_order",
                        items: lines.map(({ id, size, color, qty }) => ({ id, size, color, qty })),
                        address,
                        governorate,
                      },
                      "This order can no longer be edited.",
                      "Your order was updated."
                    )
                  }}
                >
                  <div className="trk-edit-block">
                    <span className="trk-eyebrow">Products in your order</span>
                    <OrderItemsEditor value={lines} onChange={setLines} disabled={busy} />
                    <small className="trk-hint">Items already in your order keep their price. New items use today&apos;s price. Your total is recalculated when you save.</small>
                  </div>
                  <div className="trk-edit-block">
                    <span className="trk-eyebrow">Delivery (optional)</span>
                    <label className="trk-field">
                      New delivery address
                      <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Leave empty to keep the current address" />
                    </label>
                    <label className="trk-field">
                      Governorate
                      <select value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
                        <option value="">Keep the current one</option>
                        {shipping.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name} · {s.feeEgp} EGP
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="trk-btn trk-btn-dark" type="submit" disabled={busy || !lines.length}>
                    {busy ? "Saving…" : "Save changes"}
                  </button>
                </form>
              )}
            </>
          )}
          {msg && (
            <p className={msg.ok ? "trk-ok" : "trk-error"} role="status">
              {msg.text}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
