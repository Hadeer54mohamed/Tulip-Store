import { defineField, defineType } from "sanity"
import { Film } from "lucide-react"

export const instagramReelType = defineType({
  name: "instagramReel",
  title: "Reels",
  type: "document",
  icon: Film,
  fields: [
    defineField({
      name: "title",
      title: "Title (Internal use only)",
      type: "string",
      placeholder: "Summer Collection Reel",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "videoFile",
      title: "Video File",
      type: "file",
      description: "Upload the reel video (mp4 recommended, under ~30MB). This will play inline on the site.",
      options: { accept: "video/mp4,video/webm,video/quicktime" },
    }),
    defineField({
      name: "thumbnail",
      title: "Thumbnail (cover image)",
      type: "image",
      description: "Shown before the video plays. Recommended 9:16 portrait image.",
      options: { hotspot: true },
    }),
    defineField({
      name: "link",
      title: "Instagram Reel Link (optional)",
      type: "url",
      description:
        "Optional. If provided, a 'View on Instagram' button will appear. Used as fallback if no video file is uploaded.",
      validation: (Rule) => Rule.uri({ scheme: ["http", "https"] }),
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
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "link",
      media: "thumbnail",
    },
  },
})
