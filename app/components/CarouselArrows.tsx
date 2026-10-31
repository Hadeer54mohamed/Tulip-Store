"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

/** Previous / next arrows laid over an image. Clicks never reach whatever is underneath (zoom, quick view…). */
export default function CarouselArrows({ onPrev, onNext, label = "image" }: { onPrev: () => void; onNext: () => void; label?: string }) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }
  return (
    <>
      <button type="button" className="car-arrow car-prev" onClick={stop(onPrev)} aria-label={`Previous ${label}`}>
        <ChevronLeft size={18} />
      </button>
      <button type="button" className="car-arrow car-next" onClick={stop(onNext)} aria-label={`Next ${label}`}>
        <ChevronRight size={18} />
      </button>
    </>
  )
}
