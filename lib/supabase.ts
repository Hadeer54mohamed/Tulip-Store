import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const clean = (v: unknown) =>
  String(v ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")

let cached: { key: string; client: SupabaseClient } | null = null

/** Server-only Supabase client (service role). Returns null when the env vars are missing/invalid. */
export function db(): SupabaseClient | null {
  const url = clean(process.env.SUPABASE_URL || process.env.SUPABASE_URL_2)
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_2)
  if (!/^https:\/\//.test(url) || key.length < 20) return null
  const id = `${url}|${key}`
  if (!cached || cached.key !== id)
    cached = { key: id, client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }
  return cached.client
}
