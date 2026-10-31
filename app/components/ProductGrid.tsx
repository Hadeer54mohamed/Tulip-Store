"use client"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useState } from "react"
import { QuickView } from "./CartDrawer"
import Pager from "./Pager"
import { paginate, usePageSize } from "./usePageSize"
import { img } from "@/sanity/client"
import { discountPercent, type ShopProduct } from "@/lib/products"
import { fmt } from "@/lib/format"

export type ProductCard = {
  key: string
  product: ShopProduct
  colorName?: string
  /** true = this card IS one specific colour (Collections), so it shows no colour switcher */
  fixedColor?: boolean
}

/**
 * One product card. The whole card opens the quick view; the colour dots change the picture on the card itself, and
 * the little arrow goes to the full page. Shows the discount (−20 % badge + old price) and the colours.
 */
export function ProductCardView({ card, index, onQuick }: { card: ProductCard; index: number; onQuick: (c: ProductCard) => void }) {
  const { product, fixedColor } = card
  const firstColor = (product.colors.find((c) => c.name === card.colorName) || product.colors.find((c) => !c.soldOut) || product.colors[0])?.name
  const [active, setActive] = useState(firstColor)
  const color = product.colors.find((c) => c.name === active)
  const cover = color?.images[0] ?? product.image
  const hover = color?.images[1]
  const available = color ? !color.soldOut : product.inStock
  const off = discountPercent(product.price, product.originalPrice)
  const href = `/product/${product._id}${active ? `?color=${encodeURIComponent(active)}` : ""}`
  const open = () => onQuick({ ...card, colorName: active })
  const alt = `${product.name}${active ? ` – ${active}` : ""}`
  const showDots = !fixedColor && product.colors.length > 1
  return (
    <article
      className="product-card"
      style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`Quick view ${product.name}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          open()
        }
      }}
    >
      <div className="product-image-wrap">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async" src={img(cover, 900)} alt={alt} className="product-image" />
        ) : (
          <div className="image-fallback">{product.name}</div>
        )}
        {hover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" decoding="async" src={img(hover, 900)} alt="" aria-hidden="true" className="product-image product-image-alt" />
        ) : null}
        <div className="card-badges">
          {off > 0 && <span className="badge-off">−{off}%</span>}
          {product.badge && <span className="badge-tag">{product.badge}</span>}
        </div>
        <Link href={href} className="card-view" aria-label={`View ${product.name}`} onClick={(e) => e.stopPropagation()}>
          <ArrowUpRight size={16} />
        </Link>
        {!available && <span className="sold-badge">Sold out</span>}
      </div>
      <div className="product-meta">
        <div>
          <h3>{product.name}</h3>
          <p className="card-color">
            {showDots ? (
              <span className="swatches" role="group" aria-label="Variants">
                {product.colors.slice(0, 6).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`swatch${c.name === active ? " is-active" : ""}${c.soldOut ? " is-out" : ""}`}
                    style={{ "--swatch": c.hex || "#c4b1a2" } as React.CSSProperties}
                    title={c.soldOut ? `${c.name} — sold out` : c.name}
                    aria-label={`${c.name}${c.soldOut ? " (sold out)" : ""}`}
                    aria-pressed={c.name === active}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActive(c.name)
                    }}
                  />
                ))}
                {product.colors.length > 6 && <small>+{product.colors.length - 6}</small>}
              </span>
            ) : color?.hex ? (
              <i className="color-dot" style={{ background: color.hex }} aria-hidden="true" />
            ) : null}
            <span className="card-color-name">{available ? active || "Ready to ship" : "Currently unavailable"}</span>
          </p>
        </div>
        <p className="card-price">
          <strong>{fmt(product.price)} EGP</strong>
          {off > 0 && <del>{fmt(product.originalPrice)} EGP</del>}
        </p>
      </div>
    </article>
  )
}

export function QuickViewHost({ selected, onClose }: { selected: ProductCard | null; onClose: () => void }) {
  if (!selected) return null
  return <QuickView key={selected.key} product={selected.product} initialColor={selected.colorName} onClose={onClose} />
}

/** Product cards, 8 per page on desktop and 4 on phones, with previous / next arrows. */
export default function ProductGrid({ cards, paginated = true }: { cards: ProductCard[]; paginated?: boolean }) {
  const [selected, setSelected] = useState<ProductCard | null>(null)
  const [page, setPage] = useState(1)
  const size = usePageSize()
  const view = paginated ? paginate(cards, page, size) : { slice: cards, page: 1, pages: 1 }
  return (
    <>
      {cards.length ? (
        <>
          <div className="product-grid">
            {view.slice.map((card, index) => (
              <ProductCardView key={card.key} card={card} index={index} onQuick={setSelected} />
            ))}
          </div>
          <Pager page={view.page} pages={view.pages} onChange={setPage} label="products" />
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-mark">✦</div>
          <h3>Nothing here yet.</h3>
          <p>New products are on the way.</p>
        </div>
      )}
      <QuickViewHost selected={selected} onClose={() => setSelected(null)} />
    </>
  )
}
