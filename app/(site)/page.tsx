import Link from "next/link"
import { client, img } from "@/sanity/client"
import { type ProductCard } from "@/app/components/ProductGrid"
import ShopSection from "@/app/components/ShopSection"
import CollectionsSlider from "@/app/components/CollectionsSlider"
import FeaturedDrop from "@/app/components/FeaturedDrop"
import BrandStrip from "@/app/components/BrandStrip"
import TestimonialsSection from "@/app/components/TestimonialsSection"
import ReelsGallery from "@/app/components/ReelsGallery"
import Marquee from "@/app/components/Marquee"
import { Sparkle, SpinBadge, TulipFlower } from "@/app/components/TulipArt"
import { Droplets, FlaskConical, Heart, PackageSearch, PencilLine, Sparkles, Sun, Truck, Wallet } from "lucide-react"
import { PRODUCT_FIELDS, normalizeProduct } from "@/lib/products"

export const revalidate = 60

type Testimonial = { name?: string; text?: string; rating?: number; avatar?: unknown }
type Reel = { title?: string; link?: string; thumbnail?: unknown; video?: string }
type HomeSettings = {
  featuredDropImage?: unknown
  mobileFeaturedDropImage?: unknown
  brandSectionImages?: unknown[]
} | null

export default async function Home() {
  const [rawProducts, settings, testimonials, reels, categoryDocs]: [any[], HomeSettings, Testimonial[], Reel[], { title?: string }[]] =
    await Promise.all([
      client.fetch(`*[_type=="product"]|order(order asc,_createdAt desc){${PRODUCT_FIELDS},homeSliderColor}`),
      client.fetch(`*[_type=="homeSettings"][0]{featuredDropImage,mobileFeaturedDropImage,brandSectionImages}`),
      client.fetch(`*[_type=="testimonial" && active != false]|order(order asc){name,text,rating,avatar}`),
      client.fetch(
        `*[_type=="instagramReel" && active != false]|order(order asc){title,link,thumbnail,"video":videoFile.asset->url}`
      ),
      client.fetch(`*[_type=="category"]|order(order asc,title asc){title}`),
    ])

  const products = rawProducts.map((raw) => ({ raw, product: normalizeProduct(raw) }))
  const firstAvailable = (p: ReturnType<typeof normalizeProduct>) => (p.colors.find((c) => !c.soldOut) || p.colors[0])?.name

  // "New arrivals": one card per product (its first available colour).
  const cards: ProductCard[] = products.map(({ product }) => ({
    key: product._id,
    product,
    colorName: firstAvailable(product),
  }))
  // "Collections": one card per colour ticked in the product's "Home Slider colors".
  const collections: ProductCard[] = products.flatMap(({ raw, product }) =>
    ((raw.homeSliderColor || []) as string[])
      .filter((n) => product.colors.some((c) => c.name === n))
      .map((colorName) => ({ key: `${product._id}-${colorName}`, product, colorName, fixedColor: true }))
  )

  const categories = [...new Set(categoryDocs.map((c) => c.title).filter((t): t is string => !!t))]
  const heroSource = products.find(({ product }) => product.image)?.product.image
  const dropDesktop = settings?.featuredDropImage ?? settings?.mobileFeaturedDropImage ?? heroSource
  const dropMobile = settings?.mobileFeaturedDropImage ?? undefined
  const brandImages = (settings?.brandSectionImages ?? []).map((source) => img(source, 800))

  return (
    <main className="tulip-home">
      <Marquee />

      <section className="tl-hero">
        <div className="tl-hero-copy">
          <p className="tl-chip">
            <Sparkles size={14} aria-hidden="true" /> New in skincare
          </p>
          <h1>
            <span>Pretty skin,</span>
            <span className="tl-h1-soft">pretty routine.</span>
          </h1>
          <p className="tl-hero-text">
            Gentle, effective skincare for every skin type. Simple steps your skin will love, delivered to your door anywhere in Egypt.
          </p>
          <div className="tl-hero-actions">
            <Link href="#shop" className="tl-btn tl-btn-primary">
              Shop skincare
            </Link>
            <Link href="#routine" className="tl-btn tl-btn-ghost">
              See the routine
            </Link>
          </div>
        </div>

        <div className="tl-hero-art">
          <div className="tl-arch">
            {heroSource ? (
              <img src={img(heroSource, 1200)} alt="Featured skincare" fetchPriority="high" />
            ) : (
              <div className="tl-arch-fallback" aria-hidden="true">
                <TulipFlower />
              </div>
            )}
          </div>
          <SpinBadge />
          <div className="tl-float-card">
            <Heart size={16} aria-hidden="true" />
            <div>
              <strong>Gentle by nature</strong>
              <span>For every skin type</span>
            </div>
          </div>
          <Sparkle className="tl-sparkle tl-sparkle-a" />
          <Sparkle className="tl-sparkle tl-sparkle-b" />
          <Sparkle className="tl-sparkle tl-sparkle-c" />
        </div>
      </section>

      <ul className="tl-perks" aria-label="Why shop with us">
        <li>
          <Truck size={20} aria-hidden="true" />
          <div>
            <strong>Delivery across Egypt</strong>
            <span>To every governorate</span>
          </div>
        </li>
        <li>
          <Wallet size={20} aria-hidden="true" />
          <div>
            <strong>Cash on delivery</strong>
            <span>Pay when it arrives</span>
          </div>
        </li>
        <li>
          <PackageSearch size={20} aria-hidden="true" />
          <div>
            <strong>Track your order</strong>
            <span>With your phone or order number</span>
          </div>
        </li>
        <li>
          <PencilLine size={20} aria-hidden="true" />
          <div>
            <strong>Change your mind?</strong>
            <span>Edit or cancel before it ships</span>
          </div>
        </li>
      </ul>

      <FeaturedDrop
        desktop={dropDesktop ? img(dropDesktop, 1800) : undefined}
        mobile={dropMobile ? img(dropMobile, 900) : undefined}
      />

      <ShopSection cards={cards} categories={categories} />

      <section id="routine" className="tl-routine" aria-labelledby="routine-title">
        <div className="tl-routine-head">
          <h2 id="routine-title">Your routine, step by step</h2>
          <p>Four simple steps, every morning and night. Start with one and build from there.</p>
        </div>
        <ol className="tl-steps">
          <li>
            <span className="tl-step-icon">
              <Droplets size={22} aria-hidden="true" />
            </span>
            <h3>Cleanse</h3>
            <p>Lift away the day without stripping your skin.</p>
          </li>
          <li>
            <span className="tl-step-icon">
              <FlaskConical size={22} aria-hidden="true" />
            </span>
            <h3>Treat</h3>
            <p>A serum or active for the one thing you want to fix.</p>
          </li>
          <li>
            <span className="tl-step-icon">
              <Heart size={22} aria-hidden="true" />
            </span>
            <h3>Moisturize</h3>
            <p>Lock in softness with a cream that suits your skin type.</p>
          </li>
          <li>
            <span className="tl-step-icon">
              <Sun size={22} aria-hidden="true" />
            </span>
            <h3>Protect</h3>
            <p>Finish every morning with sunscreen.</p>
          </li>
        </ol>
        <Link href="#shop" className="tl-btn tl-btn-primary tl-routine-cta">
          Shop the routine
        </Link>
      </section>

      <CollectionsSlider entries={collections} />

      <section className="editorial-grid">
        <div className="editorial-card editorial-dark">
          <p className="eyebrow">The Tulip edit</p>
          <h2>
            Small rituals.
            <br />
            Better days.
          </h2>
          <Link href="#shop" className="text-link">
            Explore the edit
          </Link>
        </div>
        <div className="editorial-card editorial-soft">
          <p className="eyebrow">A better routine</p>
          <h2>Skincare you will reach for every day.</h2>
          <p>Simple steps, nourishing textures, and ingredients chosen to care for your skin morning and night.</p>
        </div>
      </section>

      <section className="brand-note">
        <p className="eyebrow">Our point of view</p>
        <h2>Less, but better.</h2>
        <p className="brand-copy">Products that earn their place on your shelf, chosen to be used, loved, and repurchased.</p>
        <BrandStrip images={brandImages} />
        <Link href="/track" className="text-link">
          Need help with an order?
        </Link>
      </section>

      <TestimonialsSection
        items={testimonials.map((t) => ({
          name: t.name,
          text: t.text,
          rating: t.rating,
          avatar: t.avatar ? img(t.avatar, 120) : undefined,
        }))}
      />
      <ReelsGallery
        reels={reels.map((r) => ({
          title: r.title,
          link: r.link,
          video: r.video,
          thumbnail: r.thumbnail ? img(r.thumbnail, 600) : undefined,
        }))}
      />
    </main>
  )
}

export const metadata = {
  title: "Tulip Store — Skincare that glows",
  description: "Tulip Store — gentle, effective skincare for radiant skin.",
}
