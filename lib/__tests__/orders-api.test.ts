import { beforeEach, describe, expect, it, vi } from "vitest"

// A tiny stand-in for the Supabase query builder: records the calls and resolves to the rows we give it.
const calls: { method: string; args: unknown[] }[] = []
let rows: any[] = []
function builder(): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") return (resolve: any) => resolve({ data: rows, error: null, count: rows.length })
        return (...args: unknown[]) => {
          calls.push({ method: prop, args })
          return proxy
        }
      },
    }
  )
  return proxy
}
const rpcCalls: { name: string; args: any }[] = []
let rpcError: { message: string } | null = null
let rpcResult: any = null
vi.mock("@/lib/supabase", () => ({
  db: () => ({
    from: () => builder(),
    rpc: async (name: string, args: any) => {
      rpcCalls.push({ name, args })
      return { data: rpcResult, error: rpcError }
    },
  }),
}))
vi.mock("@/sanity/client", () => ({ client: { fetch: async () => [] } }))
vi.mock("next/server", async () => {
  const actual: any = await vi.importActual("next/server")
  return { ...actual, after: (fn: () => void) => fn }
})

import { GET as publicGet } from "@/app/api/orders/route"
import { GET as adminGet, DELETE as adminDelete } from "@/app/api/admin/orders/route"
import { PATCH as publicPatch } from "@/app/api/orders/route"
import { createSession } from "@/lib/admin-auth"

let ip = 0
const req = (url: string, cookie?: string) =>
  new Request(`http://x.test${url}`, { headers: { "x-forwarded-for": `10.0.0.${++ip}`, ...(cookie ? { cookie } : {}) } })

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "correct-horse-battery"
  calls.length = 0
  rpcCalls.length = 0
  rpcError = null
  rpcResult = null
  rows = []
})

describe("public order lookup", () => {
  it("finds TULIP numbers typed in any style (queries every candidate spelling)", async () => {
    rows = [{ id: "TULIP-123456", name: "Mona Ali", status: "new", items: [], total: 100 }]
    const res = await publicGet(req("/api/orders?q=tulip%20123456"))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(calls.find((c) => c.method === "in")?.args).toEqual(["id", ["TULIP-123456", "123456"]])
    expect(body.order.id).toBe("TULIP-123456")
    expect(body.order.name).toBe("Mona") // first name only
  })

  it("returns ALL orders for a phone, not just the newest", async () => {
    rows = [
      { id: "TULIP-111111", name: "Mona Ali", status: "new" },
      { id: "TULIP-222222", name: "Mona Ali", status: "delivered" },
    ]
    const body = await (await publicGet(req("/api/orders?q=%2B20%20101-234-5678"))).json()
    expect(calls.find((c) => c.method === "eq")?.args).toEqual(["phone", "01012345678"])
    expect(body.orders).toHaveLength(2)
    expect(body.matchedBy).toBe("phone")
  })

  it("never leaks the purchase cost (or any extra item field) to a customer", async () => {
    rows = [{ id: "TULIP-123456", name: "Mona Ali", status: "new", total: 100, items: [{ id: "p1", name: "Scarf", qty: 1, price: 700, size: "M", color: "Cream", cost: 400, secret: "x" }] }]
    const body = await (await publicGet(req("/api/orders?q=TULIP-123456"))).json()
    expect(Object.keys(body.order.items[0]).sort()).toEqual(["color", "id", "name", "price", "qty", "size"])
    expect(JSON.stringify(body)).not.toContain("400")
  })

  it("stays the customer view even when an admin session cookie is present", async () => {
    rows = [{ id: "TULIP-123456", name: "Mona Ali", status: "new", phone: "01012345678" }]
    const cookie = `tulip_admin=${createSession().value}`
    const body = await (await publicGet(req("/api/orders?q=TULIP-123456", cookie))).json()
    expect(body.order?.id).toBe("TULIP-123456") // used to come back as the admin list with no `order`
    expect(calls.find((c) => c.method === "select")?.args[0]).not.toContain("phone")
  })
})

describe("admin orders", () => {
  it("requires a signed admin session", async () => {
    expect((await adminGet(req("/api/admin/orders"))).status).toBe(401)
    expect((await adminGet(req("/api/admin/orders", "tulip_admin=1.bad"))).status).toBe(401)
  })

  it("searches the whole table in the database (not just the latest rows)", async () => {
    const cookie = `tulip_admin=${createSession().value}`
    const res = await adminGet(req("/api/admin/orders?q=tulip%20482913&status=shipped&page=3", cookie))
    expect(res.status).toBe(200)
    const or = String(calls.find((c) => c.method === "or")?.args[0])
    expect(or).toContain("id.ilike.%TULIP-482913%")
    expect(or).toContain("name.ilike.")
    expect(calls.find((c) => c.method === "eq")?.args).toEqual(["status", "shipped"])
    expect(calls.find((c) => c.method === "range")?.args).toEqual([16, 23])
  })
})

const send = (method: string, url: string, body: unknown, cookie?: string) =>
  new Request(`http://x.test${url}`, { method, headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}`, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) })

describe("admin delete", () => {
  it("is admin-only", async () => {
    expect((await adminDelete(send("DELETE", "/api/admin/orders", { id: "TULIP-123456" }))).status).toBe(401)
    expect(rpcCalls).toHaveLength(0)
  })
  it("removes the order for good through the database function", async () => {
    const cookie = `tulip_admin=${createSession().value}`
    const res = await adminDelete(send("DELETE", "/api/admin/orders", { id: "TULIP-123456" }, cookie))
    expect(res.status).toBe(200)
    expect(rpcCalls).toEqual([{ name: "delete_order_atomic", args: { p_id: "TULIP-123456" } }])
  })
  it("says 404 when the order is already gone", async () => {
    rpcError = { message: "NOT_FOUND" }
    const cookie = `tulip_admin=${createSession().value}`
    expect((await adminDelete(send("DELETE", "/api/admin/orders", { id: "TULIP-1" }, cookie))).status).toBe(404)
  })
})

describe("customer cancel", () => {
  it("needs the phone used at checkout", async () => {
    const res = await publicPatch(send("PATCH", "/api/orders", { id: "TULIP-123456", status: "cancelled" }))
    expect(res.status).toBe(401)
    expect(rpcCalls).toHaveLength(0)
  })
  it("passes the normalised phone to the database function", async () => {
    rpcResult = { id: "TULIP-123456", name: "Mona Ali", phone: "01012345678", status: "cancelled", items: [], total: 100, coupon: "X" }
    const res = await publicPatch(send("PATCH", "/api/orders", { id: "TULIP-123456", phone: "+20 101 234 5678", status: "cancelled" }))
    expect(rpcCalls[0]).toEqual({ name: "cancel_order_atomic", args: { p_id: "TULIP-123456", p_phone: "01012345678" } })
    const body = await res.json()
    expect(body.order.status).toBe("cancelled")
    expect(body.order.name).toBe("Mona") // first name only
    expect(body.order.coupon).toBeUndefined()
    expect(body.order.phone).toBeUndefined()
    expect(body.order.address).toBeUndefined()
  })
  it("answers with an error (not a crash) when the database returns nothing", async () => {
    rpcResult = null
    const res = await publicPatch(send("PATCH", "/api/orders", { id: "TULIP-123456", phone: "01012345678", status: "cancelled" }))
    expect(res.status).toBe(500)
  })
})
