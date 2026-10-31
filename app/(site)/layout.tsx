import Link from "next/link"
import Image from "next/image"
import { Cormorant_Garamond, Jost, Pinyon_Script } from "next/font/google"
import "../globals.css"
import "../home-sections.css"
import "../tulip-pink.css"
import "../dark-theme.css"
import { CartProvider } from "@/app/context/CartContext"
import Header from "@/app/components/Header"
import CartDrawer from "@/app/components/CartDrawer"
import { themeScript } from "@/lib/theme"

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
})
const body = Jost({ subsets: ["latin"], variable: "--font-body" })
const script = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-script" })

export const metadata = {
  title: "Tulip Store — Skincare that glows",
  description: "Tulip Store — gentle, effective skincare for radiant skin.",
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" className={`${display.variable} ${body.variable} ${script.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CartProvider>
          <Header />
          <CartDrawer />
          {children}
          <footer className="site-footer">
  <div className="footer-brand">
    <Image
      src="/logo.png"
      alt="Tulip Store"
      width={96}
      height={96}
      className="footer-logo"
    />
    <p>Gentle skincare for radiant, healthy skin.</p>
  </div>

  <div className="footer-links">
    <div>
      <span className="eyebrow">Discover</span>
      <Link href="/products">All products</Link>
      <Link href="/#shop">New arrivals</Link>
      <Link href="/track">Track an order</Link>
    </div>

    <div>
      <span className="eyebrow">Service</span>
      <Link href="/cart">Your cart</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/cookies">Cookies</Link>
    </div>
  </div>

  <div className="footer-bottom">
    <span>© 2026 Tulip Store.</span>
    <span>Skin first, always.</span>
    <span>
      Designed &amp; Developed by{" "}
      <a
        href="https://hadeer-elboghdady.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Hadeer ElBoghdady
      </a>
    </span>
  </div>
</footer>
        </CartProvider>
      </body>
    </html>
  )
}
