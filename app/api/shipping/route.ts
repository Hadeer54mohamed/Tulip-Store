import { NextResponse } from "next/server"
import { client } from "@/sanity/client"

export async function GET() {
  try {
    const settings = await client.fetch(`*[_type == "shippingSettings"][0].governorates[]{name, feeEgp}`)
    return NextResponse.json({ settings: Array.isArray(settings) ? settings : [] })
  } catch {
    return NextResponse.json({ settings: [] })
  }
}
