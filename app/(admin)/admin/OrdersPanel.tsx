"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Cog,
  Copy,
  Loader,
  MessageCircle,
  Package,
  PackageCheck,
  PenLine,
  Phone,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react"
import Pager from "@/app/components/Pager"
import { usePageSize } from "@/app/components/usePageSize"
import OrderItemsEditor, { type EditorLine } from "@/app/components/OrderItemsEditor"
import { orderMoney } from "@/lib/profit-math"
import { type Order, type Stats, STATUSES, STATUS_LABEL, egp, fmtDate, fmtShortDate, readJson } from "./types"

const STAT_ICONS = {
  new: Clock,
  confirmed: CircleCheck,
  processing: Cog,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: CircleX,
} as const

export default function OrdersPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const pageSize = usePageSize()
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsMissing, setStatsMissing] = useState(false)
  const [fillingCosts, setFillingCosts] = useState(false)
  const [costMsg, setCostMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<Order | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  // Wait for the person to stop typing before hitting the database.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(
    async (silent = false) => {
      const mine = ++seq.current
      if (!silent) setLoading(true)
      const qs = new URLSearchParams({ status, page: String(page), pageSize: String(pageSize), stats: "1" })
      if (debounced) qs.set("q", debounced)
      try {
        const res = await fetch(`/api/admin/orders?${qs}`, { cache: "no-store" })
        const data = await readJson(res)
        if (mine !== seq.current) return // a newer request already answered
        if (res.status === 401) return onUnauthorized()
        if (!res.ok) {
          setError(data.error || `Could not load orders (${res.status})`)
          return
        }
        setError("")
        setOrders(data.orders || [])
        setTotal(data.total || 0)
        if (data.stats) {
          setStats(data.stats)
          setStatsMissing(false)
        } else setStatsMissing(true)
      } catch {
        if (mine === seq.current) setError("Network problem. Check your connection and refresh.")
      } finally {
        if (mine === seq.current) setLoading(false)
      }
    },
    [status, page, pageSize, debounced, onUnauthorized]
  )

  useEffect(() => {
    load()
  }, [load])

  // New orders show up on their own every minute (only while the tab is visible).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load(true)
    }, 60_000)
    return () => clearInterval(t)
  }, [load])

  const pages = Math.max(1, Math.ceil(total / pageSize))
  const count = (s: string) => stats?.counts?.[s] ?? 0

  async function fillCosts() {
    setFillingCosts(true)
    setCostMsg(null)
    try {
      const res = await fetch("/api/admin/costs", { method: "POST" })
      const data = await readJson(res)
      if (res.status === 401) return onUnauthorized()
      if (!res.ok) return setCostMsg({ ok: false, text: data.error || "Could not fill the costs." })
      setCostMsg({
        ok: !data.stillMissing,
        text: `${data.updated} order${data.updated === 1 ? "" : "s"} updated.${data.stillMissing ? ` ${data.stillMissing} still have a product with no cost in Sanity.` : ""}`,
      })
      load(true)
    } catch {
      setCostMsg({ ok: false, text: "Network problem. Try again." })
    } finally {
      setFillingCosts(false)
    }
  }

  function applyUpdated(updated: Order) {
    setOrders((cur) => cur.map((o) => (o.id === updated.id ? updated : o)))
    setSelected(updated)
    load(true) // refresh the counters
  }

  function applyDeleted(id: string) {
    setOrders((cur) => cur.filter((o) => o.id !== id))
    setTotal((t) => Math.max(0, t - 1))
    setSelected(null)
    load(true)
  }

  return (
    <>
      <section className="stat-grid" aria-label="Order counts">
        <button className={`stat-card ${status === "all" ? "is-active" : ""}`} onClick={() => { setStatus("all"); setPage(1) }}>
          <span className="stat-icon"><Package size={16} /></span>
          <span className="stat-label">All orders</span>
          <strong>{stats ? stats.total : "—"}</strong>
        </button>
        {STATUSES.map((s) => {
          const Icon = STAT_ICONS[s]
          return (
            <button
              key={s}
              className={`stat-card tone-${s} ${status === s ? "is-active" : ""}`}
              onClick={() => { setStatus(status === s ? "all" : s); setPage(1) }}
            >
              <span className="stat-icon"><Icon size={16} /></span>
              <span className="stat-label">{STATUS_LABEL[s]}</span>
              <strong>{stats ? count(s) : "—"}</strong>
            </button>
          )
        })}
      </section>

      <section className="money-grid" aria-label="Profit and sales">
        {[
          { label: "Profit", profit: stats?.profit, sales: stats?.revenue, note: "All time" },
          { label: "This month", profit: stats?.monthProfit, sales: stats?.monthRevenue, note: "Cairo time" },
          { label: "Today", profit: stats?.todayProfit, sales: stats?.todayRevenue, note: stats ? `${stats.todayOrders} order${stats.todayOrders === 1 ? "" : "s"} today` : " " },
        ].map((c) => (
          <div className="money-card" key={c.label}>
            <span className="stat-label">{c.label}</span>
            <strong className={Number(c.profit) < 0 ? "is-loss" : undefined}>{stats && c.profit !== undefined ? egp(c.profit) : "—"}</strong>
            <small>
              Sales {stats ? egp(c.sales) : "—"} · {c.note}
            </small>
          </div>
        ))}
        <p className="money-help">
          Profit = what customers pay for the products (after coupons) − what the products cost you. Shipping and cancelled orders are left out.
        </p>
      </section>

      {stats && Number(stats.costMissing) > 0 && (
        <div className="notice notice-warn cost-missing" role="status">
          <span>
            <strong>{stats.costMissing} order{Number(stats.costMissing) === 1 ? "" : "s"}</strong> {Number(stats.costMissing) === 1 ? "has" : "have"} no product cost saved, so {Number(stats.costMissing) === 1 ? "it isn't" : "they aren't"} in the profit.
            Fill <em>Cost (EGP)</em> on the products in Sanity, then press the button.
          </span>
          <button className="btn btn-ghost btn-sm" onClick={fillCosts} disabled={fillingCosts}>
            {fillingCosts ? "Working…" : "Fill missing costs"}
          </button>
        </div>
      )}
      {costMsg && <p className={costMsg.ok ? "notice notice-ok" : "notice notice-error"} role="status">{costMsg.text}</p>}

      {statsMissing && !error && (
        <p className="notice notice-warn">
          Dashboard numbers are unavailable. Run the SQL files in <code>supabase/migrations</code> (the newest one is <code>202610050001_profit_stats.sql</code>) in the Supabase SQL editor.
        </p>
      )}

      {stats && stats.topProducts.length > 0 && (
        <section className="card">
          <h2 className="card-title">Top products</h2>
          <div className="top-list">
            {stats.topProducts.slice(0, 5).map((p, i) => (
              <div key={`${p.name}-${i}`}>
                <span className="rank">{i + 1}</span>
                <span className="grow">{p.name}</span>
                <span className="muted">{p.units} sold</span>
                <strong>{egp(p.revenue)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="toolbar">
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number, name, phone or address…"
              aria-label="Search orders"
            />
            {search && (
              <button type="button" className="clear" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>
          <div className="chips" role="tablist" aria-label="Filter by status">
            {["all", ...STATUSES].map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={status === s}
                className={status === s ? "chip is-active" : "chip"}
                onClick={() => { setStatus(s); setPage(1) }}
              >
                {s === "all" ? "All" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="notice notice-error" role="alert">{error}</p>}

        <div className="list-meta">
          <span>
            {loading ? "Loading…" : `${total} order${total === 1 ? "" : "s"}`}
            {debounced ? ` matching “${debounced}”` : ""}
          </span>
          {loading && <Loader size={14} className="spin" aria-hidden="true" />}
        </div>

        {!orders.length && !loading ? (
          <div className="empty">
            <strong>{debounced || status !== "all" ? "No orders match" : "No orders yet"}</strong>
            <span>
              {debounced || status !== "all"
                ? "Try another search or clear the filter."
                : "New orders will appear here as soon as customers check out."}
            </span>
          </div>
        ) : (
          <div className="order-list">
            {orders.map((o) => (
              <button key={o.id} className="order-row" onClick={() => setSelected(o)}>
                <Thumbs items={o.items} />
                <span className="order-main">
                  <strong className="order-id">{o.id}</strong>
                  <span className="muted">
                    {o.name || "Customer"} · {o.phone || "No phone"}
                  </span>
                  <span className="muted order-lines">{summary(o.items)}</span>
                </span>
                <span className="order-side">
                  <span className={`pill pill-${o.status || "new"}`}>{STATUS_LABEL[o.status || "new"] || o.status}</span>
                  <strong>{egp(o.total)}</strong>
                  <time className="muted">{fmtShortDate(o.created_at)}</time>
                </span>
              </button>
            ))}
          </div>
        )}

        <Pager page={page} pages={pages} onChange={setPage} label="orders" />
      </section>

      {selected && (
        <OrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={applyUpdated}
          onDeleted={applyDeleted}
          onUnauthorized={onUnauthorized}
        />
      )}
    </>
  )
}

type ShippingRow = { name: string; feeEgp: number }

/** One-line "2× Rose Serum · 1× Day Cream" so a row says what was ordered without opening it. */
function summary(items: Order["items"]) {
  const list = items || []
  const text = list
    .slice(0, 2)
    .map((i) => `${i.qty || 1}× ${i.name || "Product"}`)
    .join(" · ")
  return list.length > 2 ? `${text} · +${list.length - 2} more` : text
}

function Photo({ src, alt }: { src?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="photo" src={src} alt={alt || ""} loading="lazy" /> : <span className="photo photo-empty" aria-hidden="true"><Package size={18} /></span>
}

/** Up to three overlapping pictures of the ordered products, "+n" for the rest. */
function Thumbs({ items }: { items: Order["items"] }) {
  const list = items || []
  return (
    <span className="thumbs" aria-hidden="true">
      {list.slice(0, 3).map((it, i) => (
        <Photo key={`${it.id}-${i}`} src={it.image} alt="" />
      ))}
      {list.length > 3 && <span className="photo photo-more">+{list.length - 3}</span>}
    </span>
  )
}

function OrderModal({
  order,
  onClose,
  onUpdated,
  onDeleted,
  onUnauthorized,
}: {
  order: Order
  onClose: () => void
  onUpdated: (o: Order) => void
  onDeleted: (id: string) => void
  onUnauthorized: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", address: "", governorate: "" })
  const [lines, setLines] = useState<EditorLine[]>([])
  const [shipping, setShipping] = useState<ShippingRow[]>([])
  const current = order.status || "new"
  const money = orderMoney(order)
  const phone = order.phone || ""
  const wa = phone ? `https://wa.me/20${phone.replace(/^0/, "")}` : ""
  const cancelled = current === "cancelled"
  const editable = current !== "cancelled" && current !== "delivered"

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !editing && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, editing])

  function startEdit() {
    setForm({ name: order.name || "", phone: order.phone || "", address: order.address || "", governorate: order.governorate || "" })
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
    setError("")
    setEditing(true)
    if (!shipping.length)
      fetch("/api/shipping", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setShipping(d.settings || []))
        .catch(() => {})
  }

  async function call(method: "PATCH" | "DELETE", body: object) {
    const res = await fetch("/api/admin/orders", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: order.id, ...body }) })
    const data = await readJson<{ order?: Order; ok?: boolean }>(res)
    if (res.status === 401) {
      onUnauthorized()
      return null
    }
    if (!res.ok) {
      setError(data.error || "Something went wrong. Try again.")
      return null
    }
    return data
  }

  async function setStatus(next: string) {
    if (next === current || saving) return
    if (next === "cancelled" && !window.confirm(`Cancel ${order.id}? The coupon use is released. This can't be undone.`)) return
    setSaving(true)
    setError("")
    try {
      const data = await call("PATCH", { status: next })
      if (data?.order) onUpdated(data.order)
    } catch {
      setError("Network problem. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function save() {
    setSaving(true)
    setError("")
    try {
      const data = await call("PATCH", {
        action: "edit",
        name: form.name,
        phone: form.phone,
        address: form.address,
        governorate: form.governorate,
        items: lines.map(({ id, size, color, qty }) => ({ id, size, color, qty })),
      })
      if (data?.order) {
        onUpdated(data.order)
        setEditing(false)
      }
    } catch {
      setError("Network problem. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setSaving(true)
    setError("")
    try {
      const data = await call("DELETE", {})
      if (data?.ok) onDeleted(order.id)
    } catch {
      setError("Network problem. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(""), 1400)
    } catch {}
  }

  const addressLine = [order.address, order.governorate].filter(Boolean).join(" — ")
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))
  const governorates = shipping.some((g) => g.name === form.governorate) || !form.governorate ? shipping : [{ name: form.governorate, feeEgp: Number(order.shipping || 0) }, ...shipping]

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !editing && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
        <header className="modal-head">
          <div>
            <span className="eyebrow">{editing ? "Editing order" : "Order details"}</span>
            <h2 id="order-title">
              {order.id}
              <button className="icon-btn" onClick={() => copy("id", order.id)} aria-label="Copy order number">
                {copied === "id" ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </h2>
            <span className="muted">{fmtDate(order.created_at)}</span>
          </div>
          <div className="modal-head-side">
            <span className={`pill pill-${current}`}>{STATUS_LABEL[current] || current}</span>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        {editing ? (
          <>
            <div className="edit-grid">
              <label>
                Customer name
                <input value={form.name} onChange={set("name")} />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={set("phone")} inputMode="tel" dir="ltr" />
              </label>
              <label className="span-2">
                Delivery address
                <textarea value={form.address} onChange={set("address")} rows={2} />
              </label>
              <label className="span-2">
                Governorate (changes the shipping fee)
                <select value={form.governorate} onChange={set("governorate")}>
                  {!form.governorate && <option value="">Select governorate</option>}
                  {governorates.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name} · {g.feeEgp} EGP
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="edit-items">
              <span className="eyebrow">Products in this order</span>
              <OrderItemsEditor value={lines} onChange={setLines} disabled={saving} />
              <p className="muted small">
                Prices of products already in the order stay as they were; anything you add uses today&apos;s price. Totals and coupon are recalculated when you save.
              </p>
            </div>
            {error && <p className="notice notice-error" role="alert">{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={save} disabled={saving || !lines.length}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setEditing(false); setError("") }} disabled={saving}>
                Discard
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="info-grid">
              <div>
                <span className="eyebrow">Customer</span>
                <strong>{order.name || "—"}</strong>
              </div>
              <div>
                <span className="eyebrow">Phone</span>
                <strong dir="ltr">{phone || "—"}</strong>
                {phone && (
                  <span className="contact-links">
                    <a href={`tel:${phone}`} className="btn btn-ghost btn-sm"><Phone size={13} /> Call</a>
                    <a href={wa} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><MessageCircle size={13} /> WhatsApp</a>
                  </span>
                )}
              </div>
              <div className="span-2">
                <span className="eyebrow">Delivery address</span>
                <strong>{addressLine || "—"}</strong>
                {addressLine && (
                  <button className="btn btn-ghost btn-sm" onClick={() => copy("addr", addressLine)}>
                    {copied === "addr" ? <Check size={13} /> : <Copy size={13} />} {copied === "addr" ? "Copied" : "Copy address"}
                  </button>
                )}
              </div>
              <div>
                <span className="eyebrow">Payment</span>
                <strong>Cash on delivery</strong>
              </div>
              {order.coupon && (
                <div>
                  <span className="eyebrow">Coupon</span>
                  <strong>{order.coupon}</strong>
                </div>
              )}
            </div>

            <div className="items">
              {(order.items || []).map((it, i) => (
                <div className="item" key={`${it.id}-${i}`}>
                  <Photo src={it.image} alt={it.name} />
                  <span className="item-info">
                    <strong>{it.name || "Product"}</strong>
                    <small className="muted">
                      × {it.qty || 1}
                      {it.color ? ` · ${it.color}` : ""}
                      {it.size ? ` · ${it.size}` : ""}
                    </small>
                  </span>
                  <strong>{egp(Number(it.price || 0) * Number(it.qty || 1))}</strong>
                </div>
              ))}
            </div>

            <div className="summary">
              <div><span>Subtotal</span><strong>{egp(order.subtotal)}</strong></div>
              {Number(order.discount) > 0 && <div><span>Discount</span><strong>−{egp(order.discount)}</strong></div>}
              <div><span>Shipping</span><strong>{egp(order.shipping)}</strong></div>
              <div className="summary-total"><span>Total to collect</span><strong>{egp(order.total)}</strong></div>
              {!money.cancelled && (
                <div className="summary-profit">
                  <div><span>Product cost</span><strong>{money.costComplete ? egp(money.cost) : money.cost > 0 ? `${egp(money.cost)} +?` : "not saved"}</strong></div>
                  <div className={money.profit != null && money.profit < 0 ? "is-loss" : undefined}>
                    <span>Profit on this order</span>
                    <strong>{money.profit == null ? "—" : egp(money.profit)}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="stage">
              <span className="eyebrow">Order stage</span>
              <div className="stage-buttons">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={saving || cancelled || s === current}
                    className={s === current ? `stage-btn is-active tone-${s}` : `stage-btn tone-${s}`}
                    onClick={() => setStatus(s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {cancelled && <p className="muted small">Cancelled orders can&apos;t be reopened. You can still delete them below.</p>}
            </div>

            {error && <p className="notice notice-error" role="alert">{error}</p>}

            <div className="modal-actions">
              {editable && (
                <button className="btn btn-primary" onClick={startEdit} disabled={saving}>
                  <PenLine size={14} /> Edit order
                </button>
              )}
              {!confirmDelete ? (
                <button className="btn btn-danger-ghost" onClick={() => setConfirmDelete(true)} disabled={saving}>
                  <Trash2 size={14} /> Delete
                </button>
              ) : (
                <span className="confirm-delete" role="alert">
                  <span>Delete {order.id} permanently? It can&apos;t be recovered.</span>
                  <button className="btn btn-danger" onClick={remove} disabled={saving}>
                    {saving ? "Deleting…" : "Yes, delete forever"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)} disabled={saving}>
                    Keep it
                  </button>
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
