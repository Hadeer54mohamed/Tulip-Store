import Studio from "./Studio"

// The Studio is a client-side app; the page shell itself can be static.
export const dynamic = "force-static"

// Sanity's recommended metadata / viewport (correct mobile viewport + no indexing).
export { metadata, viewport } from "next-sanity/studio"

export default function StudioPage() {
  return <Studio />
}
