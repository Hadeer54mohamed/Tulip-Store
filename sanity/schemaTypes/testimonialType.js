import { defineField, defineType } from "sanity"

export const testimonialType = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Customer Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "text",
      title: "Review Text",
      type: "text",
      rows: 4,
      validation: (Rule) => Rule.required().min(10).max(500),
    }),
    defineField({
      name: "rating",
      title: "Rating (1 - 5)",
      type: "number",
      initialValue: 5,
      validation: (Rule) => Rule.required().min(1).max(5).integer(),
    }),
    defineField({
      name: "avatar",
      title: "Avatar (optional)",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "active",
      title: "Published",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first (e.g. 1, 2, 3...).",
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
    select: {
      title: "name",
      subtitle: "text",
      media: "avatar",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || "Testimonial",
        subtitle: typeof subtitle === "string" && subtitle.length > 60 ? subtitle.slice(0, 60) + "…" : subtitle,
        media,
      }
    },
  },
})
