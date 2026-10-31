"use client"
import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

/** Brand-section image carousel (Sanity "Home Settings → Brand Section Images"). */
export default function BrandStrip({ images }: { images: string[] }) {
  const track = useRef<HTMLDivElement>(null)
  const scroll = (dir: -1 | 1) => track.current?.scrollBy({ left: dir * Math.max(260, track.current.clientWidth * 0.8), behavior: "smooth" })
  if (!images.length) return null
  return (
    <div className="brand-strip-wrap">
      <div className="brand-strip" ref={track}>
        {images.map((src, i) => (
          <img key={i} src={src} alt="" loading="lazy" />
        ))}
      </div>
      {images.length > 1 && (
        <div className="brand-strip-arrows">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous images">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next images">
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
