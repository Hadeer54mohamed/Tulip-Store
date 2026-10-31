"use client"

import { useEffect, useState } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import "./shared.css"

export type EditorLine = { id: string; name: string; size: string; color: string; qty: number; price: number; image?: string }
type CatalogProduct = {
  id: string
  name: string
  price: number
  image: string
  colors: { name: string; hex?: string; soldOut: boolean; sizes: { size: string; soldOut: boolean }[] }[]
}

const egp = (n: number) => `${Math.round(n).toLocaleString("en-US")} EGP`
const same = (a: EditorLine, b: Pick<EditorLine, "id" | "size" | "color">) => a.id === b.id && a.size === b.size && a.color === b.color

/**
 * Add / remove products and change quantities of an order. Used by the customer (track page) and the admin.
 * It only edits the list; the server re-checks availability and recomputes every price when you save.
 */
export default function OrderItemsEditor({
  value,
  onChange,
  disabled,
}: {
  value: EditorLine[]
  onChange: (lines: EditorLine[]) => void
  disabled?: boolean
}) {
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [productId, setProductId] = useState("")
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")

  useEffect(() => {
    if (!adding || catalog) return
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCatalog(d.products || []))
      .catch(() => setLoadError(true))
  }, [adding, catalog])

  const product = catalog?.find((p) => p.id === productId)
  const colorOption = product?.colors.find((c) => c.name === color)
  const sizes = colorOption?.sizes ?? []
  const needsSize = sizes.length > 0
  const canAdd = !!product && (!product.colors.length || (!!colorOption && !colorOption.soldOut)) && (!needsSize || !!size)

  function pickProduct(id: string) {
    setProductId(id)
    const p = catalog?.find((x) => x.id === id)
    const firstColor = p?.colors.find((c) => !c.soldOut)
    setColor(firstColor?.name ?? "")
    setSize(firstColor?.sizes.find((s) => !s.soldOut)?.size ?? "")
  }
  function pickColor(name: string) {
    setColor(name)
    setSize(product?.colors.find((c) => c.name === name)?.sizes.find((s) => !s.soldOut)?.size ?? "")
  }
  function setQty(line: EditorLine, qty: number) {
    onChange(value.map((l) => (same(l, line) ? { ...l, qty: Math.min(Math.max(qty, 1), 10) } : l)))
  }
  function remove(line: EditorLine) {
    onChange(value.filter((l) => !same(l, line)))
  }
  function add() {
    if (!product || !canAdd) return
    const next = { id: product.id, name: product.name, size, color, qty: 1, price: product.price, image: product.image || undefined }
    const hit = value.find((l) => same(l, next))
    onChange(hit ? value.map((l) => (same(l, next) ? { ...l, qty: Math.min(l.qty + 1, 10) } : l)) : [...value, next])
    setAdding(false)
    setProductId("")
  }

  const subtotal = value.reduce((s, l) => s + l.price * l.qty, 0)

  return (
    <div className="oie">
      <div className="oie-lines">
        {value.map((l) => (
          <div className="oie-line" key={`${l.id}|${l.size}|${l.color}`}>
            {l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="oie-photo" src={l.image} alt="" loading="lazy" />
            ) : (
              <span className="oie-photo oie-photo-empty" aria-hidden="true" />
            )}
            <div className="oie-line-info">
              <strong>{l.name || "Product"}</strong>
              <small>{[l.color, l.size].filter(Boolean).join(" · ") || "Standard"}</small>
            </div>
            <div className="oie-qty" role="group" aria-label={`Quantity of ${l.name}`}>
              <button type="button" disabled={disabled || l.qty <= 1} onClick={() => setQty(l, l.qty - 1)} aria-label="Decrease quantity">
                <Minus size={14} />
              </button>
              <span>{l.qty}</span>
              <button type="button" disabled={disabled || l.qty >= 10} onClick={() => setQty(l, l.qty + 1)} aria-label="Increase quantity">
                <Plus size={14} />
              </button>
            </div>
            <strong className="oie-price">{egp(l.price * l.qty)}</strong>
            <button
              type="button"
              className="oie-remove"
              disabled={disabled || value.length <= 1}
              onClick={() => remove(l)}
              aria-label={`Remove ${l.name}`}
              title={value.length <= 1 ? "An order needs at least one item" : "Remove"}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="oie-sub">
        <span>Items subtotal</span>
        <strong>{egp(subtotal)}</strong>
      </div>

      {adding ? (
        <div className="oie-add">
          {loadError ? (
            <p className="oie-note">Couldn&apos;t load the products. Close and try again.</p>
          ) : !catalog ? (
            <p className="oie-note">Loading products…</p>
          ) : (
            <>
              <label>
                Product
                <select value={productId} onChange={(e) => pickProduct(e.target.value)}>
                  <option value="">Choose a product…</option>
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {egp(p.price)}
                    </option>
                  ))}
                </select>
              </label>
              {product && product.colors.length > 0 && (
                <label>
                  Variant
                  <select value={color} onChange={(e) => pickColor(e.target.value)}>
                    {product.colors.map((c) => (
                      <option key={c.name} value={c.name} disabled={c.soldOut}>
                        {c.name}
                        {c.soldOut ? " (sold out)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {needsSize && (
                <label>
                  Size
                  <select value={size} onChange={(e) => setSize(e.target.value)}>
                    {sizes.map((s) => (
                      <option key={s.size} value={s.size} disabled={s.soldOut}>
                        {s.size}
                        {s.soldOut ? " (sold out)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="oie-add-actions">
                <button type="button" className="oie-btn oie-btn-main" disabled={!canAdd} onClick={add}>
                  Add to order
                </button>
                <button type="button" className="oie-btn" onClick={() => setAdding(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button type="button" className="oie-btn" disabled={disabled} onClick={() => setAdding(true)}>
          <Plus size={14} /> Add a product
        </button>
      )}
    </div>
  )
}
