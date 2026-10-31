"use client"
import { useEffect, useState } from "react"
import { useCart } from "@/app/context/CartContext"
import { useColor } from "./ColorContext"
import { fmt } from "@/lib/format"

export default function AddToCart({ product }: { product: { id: string; name: string; price: number } }) {
  const { add } = useCart()
  const ctx = useColor()
  const current = ctx?.current
  const sizes = current?.sizes ?? []
  const [size, setSize] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  // Pick the first size that is still available whenever the variant changes.
  useEffect(() => setSize(sizes.find((s) => !s.soldOut)?.size ?? null), [current?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const anyColor = !!ctx?.colors.some((c) => !c.soldOut)
  if (ctx && !anyColor) return <p className="detail-description">Currently sold out.</p>

  const needsSize = sizes.length > 0
  const canAdd = !!current && !current.soldOut && (!needsSize || !!size)
  const addItem = () => {
    if (!canAdd || !current) return
    add({ ...product, image: current.thumb || undefined, size, color: current.name })
    setAdded(true)
    const source = document.querySelector(".detail-image") as HTMLImageElement | null
    const target = document.querySelector(".cart-link") as HTMLElement | null
    if (source && target) {
      const flying = source.cloneNode(true) as HTMLImageElement
      const from = source.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      flying.className = "fly-to-cart"
      flying.style.left = `${from.left}px`
      flying.style.top = `${from.top}px`
      flying.style.width = `${Math.min(from.width, 90)}px`
      flying.style.setProperty("--cart-x", `${to.left - from.left}px`)
      flying.style.setProperty("--cart-y", `${to.top - from.top}px`)
      document.body.appendChild(flying)
      window.setTimeout(() => flying.remove(), 650)
    }
    window.setTimeout(() => setAdded(false), 1400)
  }

  return (
    <>
      <div className="purchase-options">
        {ctx && ctx.colors.length > 0 && (
          <>
            <p className="eyebrow color-label">Variant: {current?.name}</p>
            <div className="color-row">
              {ctx.colors.map((c) => (
                <button
                  type="button"
                  key={c.name}
                  disabled={c.soldOut}
                  className={current?.name === c.name ? "color-button active" : "color-button"}
                  onClick={() => ctx.select(c.name)}
                  title={c.soldOut ? `${c.name} · sold out` : c.name}
                >
                  {c.hex ? <i className="color-dot" style={{ background: c.hex }} aria-hidden="true" /> : null}
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="eyebrow">{needsSize ? "Select size" : "Ready to ship"}</p>
        {needsSize && (
          <div className="size-row">
            {sizes.map((s) => (
              <button
                type="button"
                key={s.size}
                disabled={s.soldOut}
                className={size === s.size ? "size-button active" : "size-button"}
                onClick={() => setSize(s.size)}
                title={s.soldOut ? "Sold out" : s.size}
              >
                {s.size}
              </button>
            ))}
          </div>
        )}
        <button className="add-button" onClick={addItem} disabled={!canAdd}>
          {added ? "Added to cart" : canAdd ? "Add to cart" : "Sold out"}
        </button>
      </div>
      <div className="sticky-buy-bar">
        <span>
          {product.name} · {fmt(product.price)} EGP
        </span>
        <button className="button button-dark" onClick={addItem} disabled={!canAdd}>
          {added ? "Added" : "Buy now"}
        </button>
      </div>
    </>
  )
}
