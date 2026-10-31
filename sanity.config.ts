import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"
import { colorInput } from "@sanity/color-input"
import { schema } from "./sanity/schemaTypes"

// The Studio is embedded in the Next.js app and served at /studio (http://localhost:3000/studio in development,
// https://your-domain.com/studio in production) — no separate port. It sits in its own route group
// (app/(studio)), so the shop pages never load Sanity's editor code.
export default defineConfig({
  name: "tulip-store",
  basePath: "/studio",
  title: "Tulip Store",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID as string,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  plugins: [structureTool(), colorInput()],
  schema,
})
