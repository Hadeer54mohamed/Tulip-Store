/**
 * Root layout for the embedded Sanity Studio at /studio.
 * It lives in its own route group so the shop and the admin never download Sanity's editor code.
 */
export const metadata = {
  title: "Tulip Studio",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
}

export default function StudioRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
