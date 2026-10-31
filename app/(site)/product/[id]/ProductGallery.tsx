"use client"

import { useEffect, useState } from "react"
import { useColor } from "./ColorContext"
import CarouselArrows from "@/app/components/CarouselArrows"
import { useSwipe } from "@/app/components/useSwipe"

type Props = { name: string; images: string[] }

/** Main picture with previous / next arrows (also swipe and ← → keys), a counter, thumbnails, and click-to-zoom. */
export default function ProductGallery({ name, images: fallback }: Props) {
  const color = useColor()
  const images = color?.current?.images?.length ? color.current.images : fallback
  const count = images.length
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  useEffect(() => {
    setActive(0)
    setZoom(false)
  }, [color?.current?.name])

  const go = (n: number) => setActive((((n % count) + count) % count) || 0)
  const prev = () => count > 1 && setActive((i) => (i - 1 + count) % count)
  const next = () => count > 1 && setActive((i) => (i + 1) % count)
  const swipe = useSwipe(prev, next)

  useEffect(() => {
    if (count < 2) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + count) % count)
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % count)
      if (e.key === "Escape") setZoom(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [count])

  const safe = Math.min(active, Math.max(count - 1, 0))
  const current = images[safe] || "/placeholder-product.svg"
  return (
    <>
      <div className="pg-stage" {...swipe}>
        <button
          type="button"
          className={zoom ? "product-image-frame is-zoomed" : "product-image-frame"}
          onClick={() => setZoom((value) => !value)}
          aria-label={zoom ? "Close product zoom" : "Zoom product image"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={current} className="detail-image" src={current} alt={`${name} — ${safe + 1} of ${Math.max(count, 1)}`} />
          <span className="zoom-hint">{zoom ? "Close zoom" : "Click to zoom"}</span>
        </button>
        {count > 1 && (
          <>
            <CarouselArrows onPrev={prev} onNext={next} />
            <span className="car-count" aria-hidden="true">
              {safe + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 ? (
        <div className="product-thumbnails" aria-label="Product gallery">
          {images.map((source, index) => (
            <button
              type="button"
              key={`${index}-${source}`}
              className={index === safe ? "thumbnail is-active" : "thumbnail"}
              onClick={() => go(index)}
              aria-label={`Show picture ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
