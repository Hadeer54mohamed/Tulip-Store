import Link from "next/link"

/** Full-width featured banner (Sanity "Home Settings → Featured Drop Image" + optional mobile image). */
export default function FeaturedDrop({ desktop, mobile }: { desktop?: string; mobile?: string }) {
  return (
    <section className="featured-drop" aria-label="Featured">
      {desktop ? (
        <picture>
          {mobile ? <source media="(max-width: 720px)" srcSet={mobile} /> : null}
          <img src={desktop} alt="" className="featured-drop-image" />
        </picture>
      ) : (
        <div className="featured-drop-fallback" aria-hidden="true" />
      )}
      <div className="featured-drop-shade" aria-hidden="true" />
      <div className="featured-drop-copy">
        <p className="eyebrow">Featured this week</p>
        <h2>
          Glow, naturally.
        </h2>
        <Link href="/products" className="featured-drop-cta">
          Shop now
        </Link>
      </div>
    </section>
  )
}
