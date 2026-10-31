"use client"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { CartButton } from "@/app/components/CartDrawer"
import ThemeToggle from "@/app/components/ThemeToggle"

export default function Header() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link href="/" className="brand" onClick={close} aria-label="Tulip Store home">
          <Image src="/logo.png" alt="" width={46} height={46} priority className="brand-logo" />
          <span className="brand-text">
            Tulip <span>store</span>
          </span>
        </Link>
        <nav className={open ? "nav-links is-open" : "nav-links"} aria-label="Main navigation">
          <Link href="/" onClick={close}>
            Home
          </Link>
          <Link href="/products" onClick={close}>
            Shop
          </Link>
          <Link href="/track" onClick={close}>
            Track order
          </Link>
        </nav>
        <CartButton />
        <ThemeToggle className="theme-toggle" />
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
