"use client"

import { useEffect, useState } from "react"
import CarouselArrows from "./CarouselArrows"
import { useSwipe } from "./useSwipe"

/** Several pictures in one frame: arrows, swipe, ← → keys, dots and a counter. Resets to the first picture when `resetKey` changes. */
export default function ImageCarousel({ images, alt, resetKey, keyboard = true }: { images: string[]; alt: string; resetKey?: string; keyboard?: boolean }) {
  const [i, setI] = useState(0)
  const count = images.length
  const go = (n: number) => setI(((n % count) + count) % count)
  const prev = () => count > 1 && go(i - 1)
  const next = () => count > 1 && go(i + 1)
  const swipe = useSwipe(prev, next)

  useEffect(() => setI(0), [resetKey])
  useEffect(() => {
    if (!keyboard || count < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + count) % count)
      if (e.key === "ArrowRight") setI((n) => (n + 1) % count)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [keyboard, count])

  if (!count) return <div className="image-fallback">{alt}</div>
  const safe = Math.min(i, count - 1)
  return (
    <div className="carousel" {...swipe}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={images[safe]} className="carousel-image" src={images[safe]} alt={`${alt} — ${safe + 1} of ${count}`} decoding="async" />
      {count > 1 && (
        <>
          <CarouselArrows onPrev={prev} onNext={next} />
          <span className="car-count" aria-hidden="true">
            {safe + 1} / {count}
          </span>
          <div className="car-dots" role="tablist" aria-label="Choose picture">
            {images.map((src, n) => (
              <button key={`${n}-${src}`} type="button" role="tab" aria-selected={n === safe} aria-label={`Picture ${n + 1}`} className={n === safe ? "is-active" : undefined} onClick={() => go(n)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
