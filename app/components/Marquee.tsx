import { Flower2 } from "lucide-react"

const MESSAGES = ["Delivery across Egypt", "Cash on delivery", "Track your order anytime", "Skin first, always"]

/** Slow-moving announcement bar. The list is repeated so the loop has no gap; it pauses on hover and stops for reduced motion. */
export default function Marquee() {
  return (
    <div className="announcement tl-marquee" role="region" aria-label="Store announcements">
      <div className="tl-marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 ? "true" : undefined}>
            {MESSAGES.map((m) => (
              <li key={m}>
                <Flower2 size={13} aria-hidden="true" />
                {m}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
