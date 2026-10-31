"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ClipboardList, Eye, EyeOff, LogOut, PenSquare, Store, Ticket } from "lucide-react"
import OrdersPanel from "./OrdersPanel"
import CouponsPanel from "./CouponsPanel"
import ThemeToggle from "@/app/components/ThemeToggle"
import { readJson } from "./types"

// The Sanity Studio is embedded in this same app and served at /studio (no separate port).
const STUDIO_URL = "/studio"

type Auth = "checking" | "out" | "in"
type Tab = "orders" | "coupons"
const TABS: { id: Tab; label: string; icon: typeof Store }[] = [
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "coupons", label: "Coupons", icon: Ticket },
]

export default function AdminPage() {
  const [auth, setAuth] = useState<Auth>("checking")
  const [tab, setTab] = useState<Tab>("orders")

  // Am I already signed in? (the cookie decides — this request does not load any order data)
  useEffect(() => {
    fetch("/api/admin/orders?check=1", { cache: "no-store" })
      .then((r) => setAuth(r.status === 401 ? "out" : "in"))
      .catch(() => setAuth("out"))
  }, [])

  const onUnauthorized = useCallback(() => setAuth("out"), [])

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {})
    setAuth("out")
  }

  if (auth === "checking") return <main className="login-wrap"><div className="spinner" aria-label="Loading" /></main>
  if (auth === "out") return <Login onDone={() => setAuth("in")} />

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Image src="/logo.png" alt="Tulip Store" width={36} height={36} className="brand-logo" />
            <span className="brand-name">Tulip</span>
            <span className="brand-sep" aria-hidden="true">/</span>
            <span className="brand-section">Admin</span>
          </div>
          <div className="topbar-actions">
            {STUDIO_URL && (
              <a href={STUDIO_URL} className="btn btn-primary" target="_blank" rel="noreferrer">
                <PenSquare size={15} /> <span className="hide-sm">Sanity Studio</span>
              </a>
            )}
            <Link href="/" className="btn btn-ghost" target="_blank">
              <Store size={15} /> <span className="hide-sm">View store</span>
            </Link>
            <ThemeToggle className="btn btn-ghost icon-only" />
            <button className="btn btn-ghost" onClick={logout}>
              <LogOut size={15} /> <span className="hide-sm">Sign out</span>
            </button>
          </div>
        </div>
        <nav className="tabs" aria-label="Dashboard sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "tab is-active" : "tab"} onClick={() => setTab(id)} aria-current={tab === id}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="container">
        {tab === "orders" && <OrdersPanel onUnauthorized={onUnauthorized} />}
        {tab === "coupons" && <CouponsPanel onUnauthorized={onUnauthorized} />}
      </main>
    </>
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await readJson(res)
      if (!res.ok) return setError(data.error || "Could not sign in")
      setPassword("")
      onDone()
    } catch {
      setError("Network problem. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-wrap">
      <ThemeToggle className="btn btn-ghost icon-only login-theme" />
      <form className="login-card" onSubmit={submit}>
        <Image src="/logo.png" alt="Tulip Store" width={64} height={64} className="login-logo" priority />
        <span className="eyebrow">Tulip · Admin</span>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage orders.</p>
        <label>
          Password
          <span className="password-field">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
            <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Open dashboard"}
        </button>
        <Link href="/" className="back-link">← Back to shop</Link>
      </form>
    </main>
  )
}
