"use client"

import { useEffect, useState } from "react"

/** Cards per page: 8 on desktop, 4 on phones. Starts at the desktop size so server and first client render match. */
export function usePageSize(desktop = 8, mobile = 4, breakpoint = 720) {
  const [size, setSize] = useState(desktop)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const apply = () => setSize(mq.matches ? mobile : desktop)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [desktop, mobile, breakpoint])
  return size
}

/** Slice helper that also keeps the page inside the valid range when the list or page size changes. */
export function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const safe = Math.min(Math.max(1, page), pages)
  return { pages, page: safe, slice: items.slice((safe - 1) * size, safe * size) }
}
