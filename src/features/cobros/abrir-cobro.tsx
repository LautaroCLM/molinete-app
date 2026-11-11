"use client"

import { useEffect } from "react"
import { usePanel } from "@/components/layout/panel-context"

/** Abre el diálogo de cobro al llegar a la ficha recién dada de alta (?cobrar=1). */
export function AbrirCobro({ socioId }: { socioId: string }) {
  const { abrir } = usePanel()
  useEffect(() => {
    abrir({ tipo: "cobro", socioId })
    window.history.replaceState(null, "", window.location.pathname)
  }, [abrir, socioId])
  return null
}
