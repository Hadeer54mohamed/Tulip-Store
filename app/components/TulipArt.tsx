/** Small decorative SVGs used on the home page. Colours come from CSS variables so light and dark both work. */

/** A soft, hand-drawn style tulip. Used as the fallback picture when the shop has no product photo yet. */
export function TulipFlower({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 170" fill="none" aria-hidden="true">
      <path d="M60 150 C 59 128, 61 112, 60 90" stroke="var(--leaf-tone, #7fae8b)" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 146 C 38 144, 24 128, 22 106 C 42 110, 56 124, 60 146 Z" fill="var(--leaf-tone, #7fae8b)" opacity="0.9" />
      <path d="M60 138 C 80 136, 94 122, 98 102 C 78 106, 64 118, 60 138 Z" fill="var(--leaf-tone, #7fae8b)" opacity="0.75" />
      <path d="M60 94 C 28 90, 16 54, 26 26 C 44 36, 56 56, 60 94 Z" fill="var(--petal-2, #ff9ec3)" />
      <path d="M60 94 C 92 90, 104 54, 94 26 C 76 36, 64 56, 60 94 Z" fill="var(--petal-3, #f06aa0)" />
      <path d="M60 96 C 38 76, 38 42, 60 12 C 82 42, 82 76, 60 96 Z" fill="var(--petal-1, #ffc2da)" />
      <path d="M60 24 C 52 44, 52 66, 60 84" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

/** Four-point sparkle. */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0 C 13.4 7.2, 16.8 10.6, 24 12 C 16.8 13.4, 13.4 16.8, 12 24 C 10.6 16.8, 7.2 13.4, 0 12 C 7.2 10.6, 10.6 7.2, 12 0 Z" fill="currentColor" />
    </svg>
  )
}

/** Round badge with text running around a tulip. Spins slowly (stopped when the visitor prefers reduced motion). */
export function SpinBadge({ text = "tulip store ✿ skin first ✿ " }: { text?: string }) {
  return (
    <div className="tl-badge" aria-hidden="true">
      <svg viewBox="0 0 160 160" className="tl-badge-ring">
        <defs>
          <path id="tl-badge-circle" d="M80 80 m-62 0 a62 62 0 1 1 124 0 a62 62 0 1 1 -124 0" />
        </defs>
        <text>
          <textPath href="#tl-badge-circle" startOffset="0" textLength="385" lengthAdjust="spacing">
            {text.repeat(2)}
          </textPath>
        </text>
      </svg>
      <TulipFlower className="tl-badge-flower" />
    </div>
  )
}
