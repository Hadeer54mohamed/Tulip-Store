import type { Metadata } from "next"
import { PRODUCT_FIELDS, normalizeProduct } from "@/lib/products"
import { ColorProvider } from "./ColorContext"
import Link from "next/link"
import { notFound } from "next/navigation"
import { client, img } from "@/sanity/client"
import AddToCart from "./AddToCart"
import ProductGallery from "./ProductGallery"
import { fmt } from "@/lib/format"

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await client.fetch(
    `*[_type == "product" && _id == $id][0]{name,description,"image":colors[0].images[0]}`,
    { id }
  )
  if (!product) return { title: "Product not found — Tulip Store" }
  const image = product.image ? img(product.image, 1200) : undefined
  return {
    title: `${product.name} — Tulip Store`,
    description: product.description || `${product.name} by Tulip Store.`,
    openGraph: { title: product.name, description: product.description, images: image ? [image] : [] },
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ color?: string }>
}) {
  const { id } = await params
  const { color: initialColor } = await searchParams
  const raw = await client.fetch(`*[_type == "product" && _id == $id][0]{${PRODUCT_FIELDS}}`, { id })
  if (!raw) notFound()
  const product = normalizeProduct(raw)
  const price = product.price
  const colorViews = product.colors.map((c) => ({
    name: c.name,
    hex: c.hex,
    soldOut: c.soldOut,
    sizes: c.sizes,
    images: c.images.map((source) => img(source, 1400)),
    thumb: c.images[0] ? img(c.images[0], 300) : "",
  }))
  const lead =
    colorViews.find((c) => c.name === initialColor && !c.soldOut) || colorViews.find((c) => !c.soldOut) || colorViews[0]
  const galleryImages = lead?.images ?? []
  const image = galleryImages[0] || "/placeholder-product.svg"

  return (
    <main className="product-detail-page">
      <div className="product-breadcrumbs">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>
      <ColorProvider colors={colorViews} initial={initialColor}>
        <section className="product-detail-card" aria-labelledby="product-title">
          <div className="product-gallery">
            <div className="product-gallery-badge">TULIP STORE</div>
            <ProductGallery name={product.name || "Product"} images={galleryImages.length ? galleryImages : [image]} />
          </div>
          <div className="detail-copy">
            <p className="eyebrow">Skincare</p>
            <h1 id="product-title">{product.name}</h1>
            <p className="detail-price">
              {fmt(price)} <span>EGP</span>
              {product.originalPrice && Number(product.originalPrice) > price ? (
                <del>{fmt(Number(product.originalPrice))} EGP</del>
              ) : null}
            </p>
            {product.badge ? <span className="product-badge">{product.badge}</span> : null}
            <div className="detail-rule" />
            <p className="detail-description">
              {product.description || "Gentle skincare designed to become part of your daily routine."}
            </p>
            <div className="detail-meta">
              <span>Cash on delivery</span>
              <span>Delivery across Egypt</span>
            </div>
            <AddToCart product={{ id: product._id, name: product.name, price }} />
            {product.sizeGuide && product.sizeGuide.length > 0 ? (
              <details className="size-guide">
                <summary>Size details</summary>
                <div>
                  {product.sizeGuide.map((entry: { size?: string; description?: string }, index: number) => (
                    <p key={`${entry.size}-${index}`}>
                      <strong>{entry.size}</strong> · {entry.description}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}
            {product.skinTypes.length > 0 ? (
              <div className="skin-types" aria-label="Suitable for">
                <span className="eyebrow">Suitable for</span>
                <div>
                  {product.skinTypes.map((t) => (
                    <span key={t} className="skin-chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {product.howToUse ? (
              <details className="size-guide" open>
                <summary>How to use</summary>
                <div>
                  <p>{product.howToUse}</p>
                </div>
              </details>
            ) : null}
            {product.ingredients ? (
              <details className="size-guide">
                <summary>Key ingredients</summary>
                <div>
                  <p>{product.ingredients}</p>
                </div>
              </details>
            ) : null}
            <Link className="back-link" href="/">
              ← Continue shopping
            </Link>
          </div>
        </section>
      </ColorProvider>
    </main>
  )
}
