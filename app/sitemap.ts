import type { MetadataRoute } from "next"
import { client } from "@/sanity/client"

const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products: { _id: string; _updatedAt: string }[] = await client
    .fetch(`*[_type=="product"]{_id,_updatedAt}`)
    .catch(() => [])
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/track` },
    ...products.map((p) => ({ url: `${base}/product/${p._id}`, lastModified: p._updatedAt, priority: 0.8 })),
  ]
}
