"use client"
import Link from "next/link"
import { X, Plus, Minus, Trash2, ArrowRight } from "lucide-react"
import { useCart } from "@/app/context/CartContext"
import { img } from "@/sanity/client"
import { useEffect, useState } from "react"
import { discountPercent, type ShopProduct } from "@/lib/products"
import ImageCarousel from "./ImageCarousel"
import { fmt } from "@/lib/format"

export default function CartDrawer() {
  const { items, remove, updateQty, count, drawerOpen, setDrawerOpen } = useCart()
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  return (
    <>
      <button
        className={`drawer-overlay ${drawerOpen ? "is-visible" : ""}`}
        aria-label="Close cart"
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={`cart-drawer ${drawerOpen ? "is-open" : ""}`} aria-label="Shopping cart">
        <div className="drawer-head">
          <div>
            <p className="eyebrow">Your cart</p>
            <h2>
              {count} {count === 1 ? "item" : "items"}
            </h2>
          </div>
          <button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Close cart">
            <X />
          </button>
        </div>
        {items.length ? (
          <>
            <div className="drawer-items">
              {items.map((item) => (
                <div className="drawer-item" key={`${item.id}-${item.size}-${item.color}`}>
                  <div className="drawer-thumb">
                    {item.image ? <img loading="lazy" decoding="async" src={item.image} alt="" /> : null}
                  </div>
                  <div className="drawer-item-copy">
                    <div className="drawer-item-row">
                      <div>
                        <strong>{item.name}</strong>
                        <small>{[item.color, item.size].filter(Boolean).join(" · ") || "Standard"}</small>
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => remove(item.id, item.size, item.color)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 />
                      </button>
                    </div>
                    <div className="drawer-item-row">
                      <div className="qty-control">
                        <button
                          onClick={() => updateQty(item.id, item.size, item.qty - 1, item.color)}
                          aria-label="Decrease quantity"
                        >
                          <Minus />
                        </button>
                        <span>{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.size, item.qty + 1, item.color)}
                          aria-label="Increase quantity"
                        >
                          <Plus />
                        </button>
                      </div>
                      <strong>{fmt((item.price * item.qty))} EGP</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="drawer-summary">
              <div>
                <span>Subtotal</span>
                <strong>{fmt(subtotal)} EGP</strong>
              </div>
              <p>Shipping is calculated at checkout.</p>
              <Link href="/cart" className="button button-dark drawer-checkout" onClick={() => setDrawerOpen(false)}>
                Checkout <ArrowRight />
              </Link>
            </div>
          </>
        ) : (
          <div className="drawer-empty">
            <div className="empty-mark">∅</div>
            <h3>Your cart is empty.</h3>
            <p>Explore the edit and find something that feels like you.</p>
            <Link href="/#shop" className="button button-outline" onClick={() => setDrawerOpen(false)}>
              Explore skincare
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
export function CartButton() {
  const { count, setDrawerOpen } = useCart()
  return (
    <button className="cart-link" onClick={() => setDrawerOpen(true)} aria-label={`Open cart, ${count} items`}>
      Cart <span>{count}</span>
    </button>
  )
}
export function QuickView({
  product,
  initialColor,
  onClose,
}: {
  product: ShopProduct
  initialColor?: string
  onClose: () => void
}) {
  const { add, setDrawerOpen } = useCart()
  const firstColor =
    product.colors.find((c) => c.name === initialColor && !c.soldOut) ||
    product.colors.find((c) => !c.soldOut) ||
    product.colors[0]
  const [colorName, setColorName] = useState(firstColor?.name || "")
  const color = product.colors.find((c) => c.name === colorName) || firstColor
  const firstSize = (c?: typeof color) => c?.sizes.find((s) => !s.soldOut)?.size ?? null
  const [size, setSize] = useState<string | null>(firstSize(firstColor))
  const [showGuide, setShowGuide] = useState(false)
  const guide = (product.sizeGuide || []).filter((g) => g.size)
  const note = guide.find((g) => g.size === size)?.description
  const cover = color?.images[0] ?? product.image
  const pictures = (color?.images.length ? color.images : product.image ? [product.image] : []).map((src) => img(src, 1000))
  const off = discountPercent(product.price, product.originalPrice)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  const needsSize = !!color?.sizes.length
  const canAdd = !!color && !color.soldOut && (!needsSize || !!size)
  const pickColor = (name: string) => {
    setColorName(name)
    setSize(firstSize(product.colors.find((c) => c.name === name)))
  }
  return (
    <div
      className="quick-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view ${product.name}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="quick-modal">
        <button className="icon-button quick-close" onClick={onClose} aria-label="Close quick view">
          <X />
        </button>
        <div className="quick-image">
          <ImageCarousel images={pictures} alt={`${product.name} ${color?.name || ""}`.trim()} resetKey={color?.name} />
          {off > 0 && <span className="badge-off quick-off">−{off}%</span>}
        </div>
        <div className="quick-copy">
          <p className="eyebrow">Quick view</p>
          <h2>{product.name}</h2>
          <p className="quick-price">
            <strong>{fmt(product.price)} EGP</strong>
            {off > 0 && <del>{fmt(product.originalPrice)} EGP</del>}
          </p>
          <p className="quick-description">{product.description || "Gentle skincare for your daily routine."}</p>
          <p className={canAdd ? "stock in" : "stock out"}>
            {canAdd ? "In stock · Ready to ship" : "Currently sold out"}
          </p>
          {product.colors.length ? (
            <>
              <span className="eyebrow color-label">Variant: {color?.name}</span>
              <div className="color-row">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    disabled={c.soldOut}
                    className={color?.name === c.name ? "color-button active" : "color-button"}
                    onClick={() => pickColor(c.name)}
                  >
                    {c.hex ? <i className="color-dot" style={{ background: c.hex }} aria-hidden="true" /> : null}
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {needsSize ? (
            <>
              <div className="size-head">
                <span className="eyebrow">Select size</span>
                {guide.length > 0 && (
                  <button type="button" className="size-guide-toggle" onClick={() => setShowGuide((v) => !v)}>
                    {showGuide ? "Hide size details" : "Size details"}
                  </button>
                )}
              </div>
              <div className="size-row">
                {color!.sizes.map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    disabled={s.soldOut}
                    title={s.soldOut ? "Sold out" : s.size}
                    className={size === s.size ? "size-button active" : "size-button"}
                    onClick={() => setSize(s.size)}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
              {note && !showGuide ? (
                <p className="size-note">
                  <strong>{size}</strong> · {note}
                </p>
              ) : null}
              {showGuide && (
                <div className="size-guide-table">
                  {guide.map((g, i) => (
                    <p key={`${g.size}-${i}`}>
                      <strong>{g.size}</strong>
                      <span>{g.description}</span>
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : null}
          <button
            disabled={!canAdd}
            className="add-button"
            onClick={() => {
              add({
                id: product._id,
                name: product.name,
                price: product.price,
                image: cover ? img(cover, 300) : undefined,
                size,
                color: color?.name ?? null,
              })
              onClose()
              setDrawerOpen(true)
            }}
          >
            {canAdd ? "Add to cart" : "Sold out"}
          </button>
          <Link className="text-link" href={`/product/${product._id}`} onClick={onClose}>
            View full details <ArrowRight />
          </Link>
        </div>
      </div>
    </div>
  )
}
