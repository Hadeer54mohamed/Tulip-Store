"use client"
import { createContext, useContext, useEffect, useState } from "react"

type Item = {
  id: string
  name: string
  price: number
  image?: string
  size?: string | null
  color?: string | null
  qty: number
}
type Cart = {
  items: Item[]
  add: (item: Omit<Item, "qty">) => void
  remove: (id: string, size?: string | null, color?: string | null) => void
  updateQty: (id: string, size: string | null | undefined, qty: number, color?: string | null) => void
  clear: () => void
  count: number
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}
const Ctx = createContext<Cart | null>(null)
export const useCart = () => {
  const value = useContext(Ctx)
  if (!value) throw new Error("useCart must be used within CartProvider")
  return value
}
const same = (i: Item, id: string, size?: string | null, color?: string | null) =>
  i.id === id && (i.size ?? null) === (size ?? null) && (i.color ?? null) === (color ?? null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("shop-cart") || "[]")
      if (Array.isArray(saved)) setItems(saved)
    } catch {}
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("shop-cart", JSON.stringify(items))
      } catch {}
  }, [items, ready])
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [drawerOpen])

  const add: Cart["add"] = (item) =>
    setItems((cur) => {
      const hit = cur.find((i) => same(i, item.id, item.size, item.color))
      return hit
        ? cur.map((i) => (i === hit ? { ...i, qty: Math.min(i.qty + 1, 10) } : i))
        : [...cur, { ...item, qty: 1 }]
    })
  const remove: Cart["remove"] = (id, size, color) => setItems((c) => c.filter((i) => !same(i, id, size, color)))
  const updateQty: Cart["updateQty"] = (id, size, qty, color) =>
    qty < 1
      ? remove(id, size, color)
      : setItems((c) => c.map((i) => (same(i, id, size, color) ? { ...i, qty: Math.min(qty, 10) } : i)))
  const clear = () => setItems([])
  const count = items.reduce((n, i) => n + i.qty, 0)
  return (
    <Ctx.Provider value={{ items, add, remove, updateQty, clear, count, drawerOpen, setDrawerOpen }}>
      {children}
    </Ctx.Provider>
  )
}
export type { Item }
