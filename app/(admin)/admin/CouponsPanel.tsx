"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Pager from "@/app/components/Pager"
import { paginate, usePageSize } from "@/app/components/usePageSize"
import { readJson } from "./types"

type Coupon = {
  id: string
  code: string
  kind: "percentage" | "fixed"
  value: number
  minimum_order: number
  max_uses: number | null
  used_count: number
  expires_at: string | null
  active: boolean
}
const EMPTY = { code: "", kind: "percentage", value: "", minimum_order: "", max_uses: "", expires_at: "" }

export default function CouponsPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const size = usePageSize()
  const view = paginate(coupons, page, size)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/coupons", { cache: "no-store" })
    if (res.status === 401) return onUnauthorized()
    const data = await readJson(res)
    if (res.ok) setCoupons(data.coupons || [])
    else setMessage({ ok: false, text: data.error || "Could not load coupons" })
  }, [onUnauthorized])
  useEffect(() => {
    load()
  }, [load])

  async function create(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    const value = Number(form.value)
    if (form.kind === "percentage" && (value <= 0 || value > 100))
      return setMessage({ ok: false, text: "A percentage coupon must be between 1 and 100." })
    setBusy(true)
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, value, expires_at: form.expires_at || null }),
      })
      const data = await readJson(res)
      if (res.status === 401) return onUnauthorized()
      if (!res.ok)
        return setMessage({
          ok: false,
          text: /duplicate|unique/i.test(data.error || "") ? "This coupon code already exists." : data.error || "Could not create coupon",
        })
      setForm(EMPTY)
      setMessage({ ok: true, text: "Coupon created." })
      load()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(c: Coupon) {
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    })
    if (res.status === 401) return onUnauthorized()
    load()
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Coupons</h2>
          <p className="muted">Create discount codes and switch them on or off. One use per phone number.</p>
        </div>
      </div>
      {message && (
        <p className={message.ok ? "notice notice-ok" : "notice notice-error"} role="status">
          {message.text}
        </p>
      )}
      <form className="form-grid" onSubmit={create}>
        <label>
          Code
          <input value={form.code} onChange={set("code")} placeholder="WELCOME10" required />
        </label>
        <label>
          Type
          <select value={form.kind} onChange={set("kind")}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount (EGP)</option>
          </select>
        </label>
        <label>
          Value
          <input type="number" min="1" max={form.kind === "percentage" ? 100 : undefined} value={form.value} onChange={set("value")} required />
        </label>
        <label>
          Minimum order (EGP)
          <input type="number" min="0" value={form.minimum_order} onChange={set("minimum_order")} />
        </label>
        <label>
          Max uses
          <input type="number" min="1" value={form.max_uses} onChange={set("max_uses")} placeholder="Unlimited" />
        </label>
        <label>
          Expires
          <input type="date" value={form.expires_at} onChange={set("expires_at")} />
        </label>
        <button className="btn btn-primary form-submit" disabled={busy}>
          {busy ? "Creating…" : "Create coupon"}
        </button>
      </form>
      {coupons.length ? (
        <div className="order-list">
          {view.slice.map((c) => (
            <div key={c.id} className="order-row static">
              <span className="order-main">
                <strong className="order-id">{c.code}</strong>
                <span className="muted">
                  {c.kind === "percentage" ? `${c.value}% off` : `${c.value} EGP off`} · used {c.used_count}
                  {c.max_uses ? `/${c.max_uses}` : ""}
                  {Number(c.minimum_order) > 0 ? ` · min ${c.minimum_order} EGP` : ""}
                  {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-GB")}` : ""}
                </span>
              </span>
              <span className="order-side">
                <span className={c.active ? "pill pill-delivered" : "pill pill-cancelled"}>{c.active ? "Active" : "Off"}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>
                  {c.active ? "Disable" : "Enable"}
                </button>
              </span>
            </div>
          ))}
          <Pager page={view.page} pages={view.pages} onChange={setPage} label="coupons" />
        </div>
      ) : (
        <div className="empty">
          <strong>No coupons yet</strong>
        </div>
      )}
    </section>
  )
}
