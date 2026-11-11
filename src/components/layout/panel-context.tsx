"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { SocioIndice } from "@/lib/data"
import type { Gym, Plan, Producto, Usuario } from "@/types/domain"
import { puede, type Permiso } from "@/lib/permissions"

export type AccionRapida =
  | { tipo: "llegada"; socioId?: string }
  | { tipo: "cobro"; socioId?: string; planId?: string }
  | { tipo: "venta" }
  | null

interface PanelData {
  usuario: Usuario
  gym: Gym
  socios: SocioIndice[]
  planes: Plan[]
  productos: Producto[]
  cajaAbierta: boolean
}

interface PanelContextValue extends PanelData {
  puede: (p: Permiso) => boolean
  accion: AccionRapida
  abrir: (a: Exclude<AccionRapida, null>) => void
  cerrar: () => void
}

const Ctx = createContext<PanelContextValue | null>(null)

export function PanelProvider({ children, ...data }: PanelData & { children: React.ReactNode }) {
  const [accion, setAccion] = useState<AccionRapida>(null)
  const abrir = useCallback((a: Exclude<AccionRapida, null>) => setAccion(a), [])
  const cerrar = useCallback(() => setAccion(null), [])
  const value = useMemo<PanelContextValue>(
    () => ({ ...data, puede: (p) => puede(data.usuario.rol, p), accion, abrir, cerrar }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.usuario, data.gym, data.socios, data.planes, data.productos, data.cajaAbierta, accion, abrir, cerrar],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePanel() {
  const v = useContext(Ctx)
  if (!v) throw new Error("usePanel debe usarse dentro de <PanelProvider>")
  return v
}
