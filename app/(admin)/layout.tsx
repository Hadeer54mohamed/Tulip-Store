import { Cormorant_Garamond, Jost } from "next/font/google"
import Script from "next/script"
import "./admin.css"
import { themeScript } from "@/lib/theme"

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
})
const body = Jost({ subsets: ["latin"], variable: "--font-body" })

export const metadata = {
  title: "Tulip Admin",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
}

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="adm">{children}</body>
    </html>
  )
}
