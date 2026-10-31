"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from "lucide-react"

export type ReelView = { title?: string; link?: string; thumbnail?: string; video?: string }

/** https://www.instagram.com/reel/ABC123/ → embeddable player URL (null for any other link). */
export function instagramEmbed(link?: string): string | null {
  const m = String(link || "").match(/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)
  return m ? `https://www.instagram.com/reel/${m[1]}/embed/?autoplay=1` : null
}

const playable = (r: ReelView) => !!r.video || !!instagramEmbed(r.link)

/**
 * Reels: a swipeable row of tall cards (like Instagram). Tapping a card opens it in a full-screen player — an uploaded
 * video plays right there, an Instagram link plays through Instagram's own embed — with arrows to jump to the next reel.
 */
export default function ReelsGallery({ reels }: { reels: ReelView[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<number | null>(null)
  const scroll = (dir: -1 | 1) => track.current?.scrollBy({ left: dir * Math.max(260, (track.current?.clientWidth || 0) * 0.8), behavior: "smooth" })

  const close = useCallback(() => setOpen(null), [])
  const step = useCallback((d: number) => setOpen((i) => (i == null ? i : (i + d + reels.length) % reels.length)), [reels.length])

  useEffect(() => {
    if (open == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") step(-1)
      if (e.key === "ArrowRight") step(1)
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, close, step])

  if (!reels.length) return null
  const current = open != null ? reels[open] : null
  const embed = current ? instagramEmbed(current.link) : null
  return (
    <section className="reels-section" aria-label="Reels">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Follow the edit</p>
          <h2>Seen on Instagram</h2>
        </div>
        {reels.length > 2 && (
          <div className="collections-arrows">
            <button type="button" className="avx-pager-btn" onClick={() => scroll(-1)} aria-label="Previous reels">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="avx-pager-btn" onClick={() => scroll(1)} aria-label="Next reels">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="reels-track" ref={track}>
        {reels.map((reel, i) => {
          const can = playable(reel)
          const Tag = can ? "button" : reel.link ? "a" : "div"
          const props: Record<string, unknown> = can
            ? { type: "button", onClick: () => setOpen(i), "aria-label": `Play ${reel.title || "reel"}` }
            : reel.link
              ? { href: reel.link, target: "_blank", rel: "noreferrer", "aria-label": `Open ${reel.title || "reel"} on Instagram` }
              : {}
          return (
            <Tag className="reel-card" key={`${reel.title}-${i}`} {...props}>
              <span className="reel-media">
                {reel.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reel.thumbnail} alt="" loading="lazy" decoding="async" />
                ) : reel.video ? (
                  <video src={`${reel.video}#t=0.1`} muted playsInline preload="metadata" />
                ) : (
                  <span className="reel-blank" aria-hidden="true" />
                )}
                <span className="reel-shade" aria-hidden="true" />
                {(can || reel.link) && (
                  <span className="reel-play" aria-hidden="true">
                    <Play size={22} fill="currentColor" />
                  </span>
                )}
                <span className="reel-title">{reel.title || "Reel"}</span>
              </span>
            </Tag>
          )
        })}
      </div>

      {current && (
        <div className="reel-lightbox" role="dialog" aria-modal="true" aria-label={current.title || "Reel"} onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <button type="button" className="rl-close" onClick={close} aria-label="Close">
            <X size={22} />
          </button>
          {reels.length > 1 && (
            <>
              <button type="button" className="rl-nav rl-prev" onClick={() => step(-1)} aria-label="Previous reel">
                <ChevronLeft size={26} />
              </button>
              <button type="button" className="rl-nav rl-next" onClick={() => step(1)} aria-label="Next reel">
                <ChevronRight size={26} />
              </button>
            </>
          )}
          <div className="rl-stage">
            {current.video ? (
              <video key={current.video} src={current.video} poster={current.thumbnail} autoPlay controls playsInline onEnded={() => reels.length > 1 && step(1)} />
            ) : embed ? (
              <iframe key={embed} src={embed} title={current.title || "Instagram reel"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            ) : null}
          </div>
          <p className="rl-caption">
            <span>{current.title || "Reel"}</span>
            {current.link && (
              <a href={current.link} target="_blank" rel="noreferrer">
                Instagram <ExternalLink size={13} />
              </a>
            )}
          </p>
        </div>
      )}
    </section>
  )
}
