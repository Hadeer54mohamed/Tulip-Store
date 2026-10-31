import { defineField, defineType } from "sanity"

export const homeSettingsType = defineType({
  name: "homeSettings",
  title: "Home Settings",
  type: "document",
  fields: [
    defineField({
      name: "featuredDropImage",
      title: "Featured Banner Image",
      type: "image",
      options: { hotspot: true },
      description:
        "Main image for the featured banner section. If no mobile-specific image is set, this image will be reused on mobile too.",
    }),
    defineField({
      name: "mobileFeaturedDropImage",
      title: "Mobile Featured Banner Image",
      type: "image",
      options: { hotspot: true },
      description: "Optional mobile-specific image. If empty, the main featured image will be used.",
    }),
    defineField({
      name: "brandSectionImages",
      title: "Brand Section Images",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
        },
      ],
      description: "Carousel images for the brand section. If empty, default images will be used.",
    }),
  ],
  preview: {
    select: {
      title: "_id",
    },
    prepare() {
      return {
        title: "Home Settings",
      }
    },
  },
})
