"use client"
import { useState } from "react"
import Pager from "./Pager"
import { paginate, usePageSize } from "./usePageSize"

export type TestimonialView = { name?: string; text?: string; rating?: number; avatar?: string }

export default function TestimonialsSection({ items }: { items: TestimonialView[] }) {
  const [page, setPage] = useState(1)
  const size = usePageSize()
  if (!items.length) return null
  const view = paginate(items, page, size)
  return (
    <section className="testimonials-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Customer notes</p>
          <h2>Client stories</h2>
        </div>
      </div>
      <div className="testimonials-grid">
        {view.slice.map((t, index) => (
          <blockquote key={`${t.name}-${index}`}>
            {t.rating ? (
              <p className="testimonial-stars" aria-label={`${t.rating} out of 5`}>
                {"★".repeat(Math.min(5, Math.max(1, Math.round(t.rating))))}
              </p>
            ) : null}
            <p>“{t.text}”</p>
            <div className="testimonial-person">
              {t.avatar ? <img src={t.avatar} alt="" loading="lazy" /> : <span className="testimonial-initial">{(t.name || "?").charAt(0)}</span>}
              <cite>{t.name}</cite>
            </div>
          </blockquote>
        ))}
      </div>
      <Pager page={view.page} pages={view.pages} onChange={setPage} label="testimonials" />
    </section>
  )
}
