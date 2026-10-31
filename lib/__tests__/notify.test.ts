import { describe, expect, it } from "vitest"
import { formatOrderMessage } from "@/lib/notify"

const order = {
  id: "TULIP-482913",
  name: "Mona Ali",
  phone: "01012345678",
  address: "12 Tahrir St",
  governorate: "Cairo",
  total: 1550,
  items: [{ name: "Silk Scarf", qty: 2, size: "M", color: "Cream", price: 700 }],
}

describe("formatOrderMessage", () => {
  it("includes order, customer, items and total", () => {
    const m = formatOrderMessage("new", order)
    expect(m).toContain("New order TULIP-482913")
    expect(m).toContain("Silk Scarf × 2 · M · Cream — 1,400 EGP")
    expect(m).toContain("Total: 1,550 EGP")
  })
  it("marks cancellations", () => expect(formatOrderMessage("cancelled", order)).toContain("cancelled by customer"))
})
