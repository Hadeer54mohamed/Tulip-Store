"use client"
import { createContext, useContext, useState } from "react"
import type { SizeOption } from "@/lib/products"

export type ColorView = {
  name: string
  hex?: string
  soldOut: boolean
  sizes: SizeOption[]
  images: string[]
  thumb: string
}
type Ctx = { colors: ColorView[]; current?: ColorView; select: (name: string) => void }
const ColorCtx = createContext<Ctx | null>(null)

export const useColor = () => useContext(ColorCtx)

export function ColorProvider({
  colors,
  initial,
  children,
}: {
  colors: ColorView[]
  initial?: string
  children: React.ReactNode
}) {
  const start = colors.find((c) => c.name === initial && !c.soldOut) || colors.find((c) => !c.soldOut) || colors[0]
  const [name, setName] = useState(start?.name || "")
  const current = colors.find((c) => c.name === name)
  return <ColorCtx.Provider value={{ colors, current, select: setName }}>{children}</ColorCtx.Provider>
}
