import { NextResponse } from "next/server"
import { ADMIN_COOKIE, checkPassword, createSession, adminConfigured } from "@/lib/admin-auth"

export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin is not configured." }, { status: 500 })
  const body = await req.json().catch(() => ({}))
  if (!checkPassword(req, String(body?.password || "")))
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
  const session = createSession()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
  return res
}
