"use client"
import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProductCardView, QuickViewHost, type ProductCard } from "./ProductGrid"

/** Horizontal slider of the colours picked in "Home Slider colors" on each product (the "Shop by routine" row). */
export default function CollectionsSlider({ entries }: { entries: ProductCard[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<ProductCard | null>(null)
  const scroll = (dir: -1 | 1) => track.current?.scrollBy({ left: dir * Math.max(280, track.current.clientWidth * 0.8), behavior: "smooth" })
  if (!entries.length) return null
  return (
    <section className="collections" aria-label="Collections">
      <div className="section-heading">
        <div>
          <p className="eyebrow">The edit</p>
          <h2>Shop by routine</h2>
        </div>
        <div className="collections-arrows">
          <button type="button" className="avx-pager-btn" onClick={() => scroll(-1)} aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="avx-pager-btn" onClick={() => scroll(1)} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="collections-track" ref={track}>
        {entries.map((card, i) => (
          <div className="collections-item" key={card.key}>
            <ProductCardView card={card} index={i} onQuick={setSelected} />
          </div>
        ))}
      </div>
      <QuickViewHost selected={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
