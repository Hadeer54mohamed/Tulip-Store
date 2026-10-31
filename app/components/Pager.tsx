"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import "./shared.css"

/** Previous / next arrows with "2 / 5". Renders nothing when everything fits on one page. */
export default function Pager({
  page,
  pages,
  onChange,
  label = "items",
}: {
  page: number
  pages: number
  onChange: (page: number) => void
  label?: string
}) {
  if (pages <= 1) return null
  return (
    <nav className="avx-pager" aria-label={`${label} pages`}>
      <button type="button" className="avx-pager-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={`Previous ${label}`}>
        <ChevronLeft size={18} />
      </button>
      <span className="avx-pager-count" aria-live="polite">
        {page} / {pages}
      </span>
      <button type="button" className="avx-pager-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={`Next ${label}`}>
        <ChevronRight size={18} />
      </button>
    </nav>
  )
}
