import { NextResponse } from "next/server"
import { client, img } from "@/sanity/client"
import { PRODUCT_FIELDS, normalizeProduct } from "@/lib/products"

/** Light product list used by the "add a product to this order" picker (customer + admin). */
export async function GET() {
  try {
    const raw: any[] = await client.fetch(`*[_type=="product"]|order(order asc,_createdAt desc){${PRODUCT_FIELDS}}`)
    const products = raw.map(normalizeProduct).map((p) => ({
      id: p._id,
      name: p.name,
      price: p.price,
      image: p.image ? img(p.image, 160) : "",
      colors: p.colors.map((c) => ({ name: c.name, hex: c.hex, soldOut: c.soldOut, sizes: c.sizes })),
    }))
    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    )
  } catch {
    return NextResponse.json({ products: [] })
  }
}
