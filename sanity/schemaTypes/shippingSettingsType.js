import { defineArrayMember, defineField, defineType } from "sanity"

/** Single-document type; pinned in Desk Structure as ID `shippingSettings`. */
export const shippingSettingsType = defineType({
  name: "shippingSettings",
  title: "Shipping governorates",
  type: "document",
  preview: {
    select: { gov: "governorates" },
    prepare({ gov }) {
      const n = Array.isArray(gov) ? gov.length : 0
      return {
        title: "Shipping governorates",
        subtitle: n ? `${n} governorate${n === 1 ? "" : "s"}` : "Empty — checkout will have no available governorates",
      }
    },
  },
  fields: [
    defineField({
      name: "governorates",
      title: "Governorates & fees",
      description:
        "Adds what customers see at checkout and track-your-order (name + shipping fee EGP). If this list is empty, checkout has no available governorates.",
      type: "array",
      options: {
        sortable: true,
      },
      of: [
        defineArrayMember({
          type: "object",
          name: "governorateRow",
          title: "Governorate",
          fields: [
            defineField({
              name: "name",
              title: "Governorate name",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "feeEgp",
              title: "Shipping fee (EGP)",
              type: "number",
              validation: (Rule) => Rule.required().min(0),
            }),
          ],
          preview: {
            select: { title: "name", fee: "feeEgp" },
            prepare({ title, fee }) {
              return {
                title: title || "(unnamed)",
                subtitle: typeof fee === "number" ? `EGP ${fee}` : "—",
              }
            },
          },
        }),
      ],
    }),
  ],
})
