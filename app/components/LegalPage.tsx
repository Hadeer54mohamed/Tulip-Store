import Link from "next/link"
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="legal-page">
      <Link href="/" className="back-link">
        ← Back to Tulip Store
      </Link>
      <p className="eyebrow">Tulip Store policy</p>
      <h1>{title}</h1>
      <div className="legal-copy">
        {children}
        <h2>Contact</h2>
        <p>For help with an order, use the tracking page or contact our support team.</p>
      </div>
    </main>
  )
}
