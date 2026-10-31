"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="utility-page">
      <div className="utility-card">
        <p className="eyebrow">Something went wrong</p>
        <h1>We hit a snag.</h1>
        <p className="utility-lead">Please try again. If it keeps happening, contact us.</p>
        <button className="button button-dark" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  )
}
