import { defineField, defineType, defineArrayMember } from "sanity"
import { HomeSliderColorsInput } from "../components/HomeSliderColorsInput"

// One list for "Sizes", "Stock by size" and "Size details" so they always match.
const SIZE_OPTIONS = ["10 ml", "15 ml", "30 ml", "50 ml", "75 ml", "100 ml", "150 ml", "200 ml", "250 ml", "400 ml", "500 ml", "10 g", "30 g", "50 g", "100 g", "200 g", "Travel size", "Full size", "Set / Kit", "Standard"].map((value) => ({ title: value, value }))

export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug (used in URL)",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "price",
      title: "Price (EGP)",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "originalPrice",
      title: "Original Price (EGP)",
      type: "number",
      description:
        "Optional. If set and higher than Price, it will be shown as a strikethrough price and a discount badge will appear.",
      validation: (Rule) =>
        Rule.min(0).custom((value, context) => {
          const price = context?.document?.price
          if (value == null || value === 0) return true
          if (typeof price === "number" && value < price) {
            return "Original price must be greater than or equal to Price."
          }
          return true
        }),
    }),
    defineField({
      name: "cost",
      title: "Cost (EGP) — Internal",
      type: "number",
      description: "Internal: how much YOU pay for ONE unit. The admin uses it to calculate profit: sales after discount − cost. It is saved on each order when the order is placed (so changing it later does not change old orders). Never shown to customers. Leave it empty and orders of this product show \"cost missing\" instead of a profit.",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "badge",
      title: "Badge",
      type: "string",
      description: "Optional label shown on the product card.",
      options: {
        list: [
          { title: "None", value: "" },
          { title: "NEW", value: "NEW" },
          { title: "BESTSELLER", value: "BESTSELLER" },
          { title: "LIMITED", value: "LIMITED" },
          { title: "SALE", value: "SALE" },
        ],
      },
    }),
    defineField({
      name: "colors",
      title: "Variants (shade / scent / pack)",
      description: "Each variant has its own photos. A product with no real variants still needs one — name it \"Standard\" (or the product name).",
      type: "array",
      validation: (Rule) => Rule.required().min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "color",
          title: "Variant",
          fields: [
            defineField({
              name: "name",
              title: "Variant name (e.g. Rose, Unscented, Fair)",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "value",
              title: "Swatch colour (optional — shown as a small dot)",
              type: "color",
              options: { disableAlpha: true },
            }),
            defineField({
              name: "soldOut",
              title: "Sold Out (entire variant)",
              type: "boolean",
              description:
                "When ticked, customers see this variant as sold out (it can't be ordered).",
              initialValue: false,
            }),
            defineField({
              name: "images",
              title: "Images",
              type: "array",
              of: [
                defineArrayMember({
                  type: "image",
                  options: { hotspot: true },
                }),
              ],
              validation: (Rule) => Rule.required().min(1),
            }),
            defineField({
              name: "stockEntries",
              title: "📦 Sold-out switches by size (optional)",
              description:
                "Every size you ticked in the product's \"Sizes\" is sold in every variant automatically. Add a row here only to switch ONE size off for THIS variant (tick Sold out) or to keep your own count of units. The shop never blocks an order because of a number — only Sold out does.",
              type: "array",
              of: [
                defineArrayMember({
                  type: "object",
                  name: "stockEntry",
                  title: "Stock Entry",
                  fields: [
                    defineField({
                      name: "size",
                      title: "Size",
                      type: "string",
                      options: { list: SIZE_OPTIONS },
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "stock",
                      title: "Units left (your own note, optional)",
                      type: "number",
                      description:
                        "Just for you — the shop does not change this number when an order comes in. Tick Sold out to stop selling this size.",
                      validation: (Rule) => Rule.integer(),
                    }),
                    defineField({
                      name: "soldOut",
                      title: "Sold Out",
                      type: "boolean",
                      description:
                        "When ticked, customers see this size as sold out in this variant (it can't be ordered).",
                      initialValue: false,
                    }),
                    defineField({
                      name: "initialStock",
                      title: "Initial Stock",
                      description:
                        "Optional. Your own note of the starting quantity.",
                      type: "number",
                      validation: (Rule) => Rule.min(0).integer(),
                    }),
                  ],
                  preview: {
                    select: {
                      size: "size",
                      stock: "stock",
                      initial: "initialStock",
                      soldOut: "soldOut",
                    },
                    prepare({ size, stock, initial, soldOut }) {
                      const note = typeof stock === "number" ? `${stock}${typeof initial === "number" ? ` / ${initial}` : ""} units (note)` : "on sale"
                      return { title: `Size ${size || "?"}`, subtitle: soldOut ? "⛔ SOLD OUT in this variant" : note }
                    },
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: {
              title: "name",
              hex: "value.hex",
              media: "images.0",
              entries: "stockEntries",
              soldOut: "soldOut",
            },
            prepare({ title, hex, media, entries, soldOut }) {
              const outSizes = Array.isArray(entries) ? entries.filter((x) => x?.soldOut).map((x) => x.size).filter(Boolean) : []
              let subtitle = hex || ""
              if (soldOut) subtitle += `${subtitle ? " · " : ""}⛔ SOLD OUT`
              else if (outSizes.length) subtitle += `${subtitle ? " · " : ""}sold out: ${outSizes.join(", ")}`
              return { title: title || "Variant", subtitle, media }
            },
          },
        }),
      ],
    }),
    defineField({
      name: "homeSliderColor",
      title: "Home slider variants (Shop by routine row)",
      type: "array",
      description:
        "Pick one or more variants — each gets its own card in the home slider row. Leave empty to leave this product out of that row.",
      of: [defineArrayMember({ type: "string" })],
      components: { input: HomeSliderColorsInput },
    }),
    defineField({
      name: "sizes",
      title: "Sizes",
      type: "array",
      of: [{ type: "string" }],
      options: { list: SIZE_OPTIONS },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "skinTypes",
      title: "Suitable for (skin type)",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: ["All skin types", "Normal", "Dry", "Oily", "Combination", "Sensitive", "Acne-prone", "Mature", "Hair", "Body"].map((value) => ({ title: value, value })),
      },
    }),
    defineField({
      name: "ingredients",
      title: "Key ingredients",
      type: "text",
      rows: 3,
      description: "Optional. Shown in a \"Key ingredients\" section on the product page.",
    }),
    defineField({
      name: "howToUse",
      title: "How to use",
      type: "text",
      rows: 3,
      description: "Optional. Shown in a \"How to use\" section on the product page.",
    }),
    defineField({
      name: "sizeGuide",
      title: "Size details",
      type: "array",
      description: "Optional. A short note for each size, e.g. \"50 ml · about 2 months of daily use\". Shown on the product page.",
      of: [
        defineArrayMember({
          type: "object",
          name: "sizeGuideEntry",
          title: "Size detail",
          fields: [
            defineField({
              name: "size",
              title: "Size",
              type: "string",
              options: { list: SIZE_OPTIONS },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: 'Lower numbers appear first (e.g. 1, 2, 3...). Used for the "Featured" sort.',
      initialValue: 100,
    }),
  ],
  orderings: [
    {
      title: "Display Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "name", categoryTitle: "category.title", media: "colors.0.images.0", price: "price" },
    prepare({ title, categoryTitle, media, price }) {
      return { title, subtitle: [categoryTitle, typeof price === "number" ? `${price} EGP` : ""].filter(Boolean).join(" · "), media }
    },
  },
})
