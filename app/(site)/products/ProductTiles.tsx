"use client"
import { useState } from "react"
import Link from "next/link"
import Pager from "@/app/components/Pager"
import { paginate, usePageSize } from "@/app/components/usePageSize"
import { discountPercent } from "@/lib/products"
import { fmt } from "@/lib/format"

export type Tile = { id: string; name: string; price: number; category: string; image: string; soldOut: boolean; originalPrice?: number; colors?: string[] }

/** The shop grid: 8 products per page on desktop, 4 on phones, with previous / next arrows. */
export default function ProductTiles({ tiles }: { tiles: Tile[] }) {
  const [page, setPage] = useState(1)
  const size = usePageSize()
  const view = paginate(tiles, page, size)
  if (!tiles.length)
    return (
      <div className="empty-state">
        <div className="empty-mark">✦</div>
        <h3>No pieces found.</h3>
        <p>Try another search or category.</p>
      </div>
    )
  return (
    <>
      <section className="products-grid">
        {view.slice.map((tile) => (
          <Link href={`/product/${tile.id}`} className="product-tile" key={tile.id}>
            {discountPercent(tile.price, tile.originalPrice) > 0 && <span className="badge-off">−{discountPercent(tile.price, tile.originalPrice)}%</span>}
            {tile.image ? <img src={tile.image} alt={tile.name} loading="lazy" /> : <div className="product-tile-fallback" />}
            <div className="product-tile-copy">
              <span>{tile.soldOut ? "Sold out" : tile.category || "shop."}</span>
              <h2>{tile.name}</h2>
              <strong>
                {fmt(tile.price)} EGP
                {discountPercent(tile.price, tile.originalPrice) > 0 && <del>{fmt(tile.originalPrice)} EGP</del>}
              </strong>
              {tile.colors && tile.colors.length > 1 && (
                <span className="tile-dots" aria-hidden="true">
                  {tile.colors.map((c, i) => (
                    <i key={`${c}-${i}`} style={{ background: c }} />
                  ))}
                </span>
              )}
            </div>
          </Link>
        ))}
      </section>
      <Pager page={view.page} pages={view.pages} onChange={setPage} label="products" />
    </>
  )
}
