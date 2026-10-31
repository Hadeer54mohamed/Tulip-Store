import Link from "next/link"

export default function NotFound() {
  return (
    <main className="utility-page">
      <div className="utility-card">
        <p className="eyebrow">404</p>
        <h1>Page not found.</h1>
        <p className="utility-lead">The product you are looking for is no longer here.</p>
        <Link href="/products" className="button button-dark">
          Browse all products
        </Link>
      </div>
    </main>
  )
}
