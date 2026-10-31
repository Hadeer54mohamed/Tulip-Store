import Link from "next/link"
import { client, img } from "@/sanity/client"
import { PRODUCT_FIELDS, normalizeProduct, type ShopProduct } from "@/lib/products"
import ProductTiles from "./ProductTiles"

export const revalidate = 60

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams
  const products: ShopProduct[] = (
    await client.fetch(`*[_type=="product"]|order(order asc,_createdAt desc){${PRODUCT_FIELDS}}`)
  ).map(normalizeProduct)
  const query = params.q?.toLowerCase().trim() || ""
  const filtered = products.filter(
    (product) =>
      (!query || product.name.toLowerCase().includes(query)) &&
      (!params.category || product.category === params.category)
  )
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))]
  const tiles = filtered.map((product) => ({
    id: product._id,
    name: product.name,
    price: product.price,
    category: product.category || "",
    image: product.image ? img(product.image, 700) : "",
    soldOut: !product.inStock,
    originalPrice: product.originalPrice,
    colors: product.colors.map((c) => c.hex).filter((h): h is string => !!h).slice(0, 6),
  }))
  return (
    <main className="products-page">
      <header className="products-heading">
        <div>
          <p className="eyebrow">The complete range</p>
          <h1>All products.</h1>
        </div>
        <form className="product-search">
          <input name="q" defaultValue={params.q} placeholder="Search products" aria-label="Search products" />
          <button>Search</button>
        </form>
      </header>
      <nav className="filter-tabs">
        <Link href="/products" className={!params.category ? "is-active" : undefined}>
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category}
            href={`/products?category=${encodeURIComponent(category!)}`}
            className={params.category === category ? "is-active" : undefined}
          >
            {category}
          </Link>
        ))}
      </nav>
      <div className="products-count">{filtered.length} products</div>
      <ProductTiles key={`${query}|${params.category || ""}`} tiles={tiles} />
    </main>
  )
}
