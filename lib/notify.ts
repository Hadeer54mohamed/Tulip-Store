export type NotifyOrder = {
  id: string
  name: string
  phone: string
  address: string
  governorate: string
  total: number
  items: { name?: string; qty: number; size?: string; color?: string; price: number }[]
}

export function formatOrderMessage(kind: "new" | "cancelled", o: NotifyOrder) {
  const lines = o.items.map(
    (i) =>
      `• ${i.name || "Item"} × ${i.qty}${i.size ? ` · ${i.size}` : ""}${i.color ? ` · ${i.color}` : ""} — ${(i.price * i.qty).toLocaleString("en-US")} EGP`
  )
  const title = kind === "new" ? `🛍 New order ${o.id}` : `❌ Order ${o.id} cancelled by customer`
  return [
    title,
    `${o.name} · ${o.phone}`,
    `${o.governorate} — ${o.address}`,
    "",
    ...lines,
    "",
    `Total: ${o.total.toLocaleString("en-US")} EGP (cash on delivery)`,
  ].join("\n")
}

/** Sends a Telegram message if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set. Never throws: a failed alert must not fail the order. */
export async function notifyOrder(kind: "new" | "cancelled", order: NotifyOrder) {
  const text = formatOrderMessage(kind, order)
  const jobs: Promise<unknown>[] = []
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      })
    )
  }
  await Promise.allSettled(jobs)
}
