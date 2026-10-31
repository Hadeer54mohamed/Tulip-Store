"use client"
import { useState } from "react"
import Link from "next/link"
import ProductGrid, { type ProductCard } from "./ProductGrid"

/** "New arrivals" with category tabs (Sanity "Category" documents) and a paged grid. */
export default function ShopSection({ cards, categories }: { cards: ProductCard[]; categories: string[] }) {
  const [active, setActive] = useState("All")
  const count = (cat: string) => (cat === "All" ? cards.length : cards.filter((c) => c.product.category === cat).length)
  const tabs = ["All", ...categories.filter((c) => count(c) > 0)]
  const shown = active === "All" ? cards : cards.filter((c) => c.product.category === active)
  return (
    <section id="shop" className="shop-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Curated for your skin</p>
          <h2>New arrivals</h2>
        </div>
        <Link href="/products" className="result-count">
          View all {cards.length} products
        </Link>
      </div>
      {tabs.length > 2 && (
        <div className="shop-tabs" role="tablist" aria-label="Product categories">
          {tabs.map((cat) => (
            <button key={cat} role="tab" aria-selected={active === cat} className={active === cat ? "shop-tab is-active" : "shop-tab"} onClick={() => setActive(cat)}>
              {cat}
              <small>{count(cat)}</small>
            </button>
          ))}
        </div>
      )}
      <ProductGrid key={active} cards={shown} />
    </section>
  )
}
