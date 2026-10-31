"use client"

import { NextStudio } from "next-sanity/studio"
import config from "@/sanity.config"

// Must be a client component: Sanity's config pulls in browser-only code that cannot be evaluated in a server component.
export default function Studio() {
  return <NextStudio config={config} />
}
