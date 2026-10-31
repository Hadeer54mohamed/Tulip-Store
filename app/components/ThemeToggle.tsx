"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { THEME_KEY } from "@/lib/theme"

/** Light / dark switch shared by the shop and the admin. The choice is remembered in this browser. */
export default function ThemeToggle({ className = "theme-toggle" }: { className?: string }) {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark")
  }, [])
  function toggle() {
    const next = dark ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {}
    setDark(!dark)
  }
  return (
    <button type="button" className={className} onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
