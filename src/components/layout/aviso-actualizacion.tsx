"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const ID_TOAST = "nueva-version"
const CADA_MS = 5 * 60 * 1000

/**
 * Avisa cuando se publicó una versión nueva de Molinete mientras la pantalla estaba abierta.
 * "Actualizar" recarga la página (en la app de escritorio, que carga la web, eso la actualiza).
 */
export function AvisoActualizacion() {
  useEffect(() => {
    const actual = process.env.NEXT_PUBLIC_BUILD_ID
    if (!actual || actual === "dev") return

    async function revisar() {
      try {
        const r = await fetch("/api/version", { cache: "no-store" })
        if (!r.ok) return
        const { id } = (await r.json()) as { id?: string }
        if (id && id !== actual) {
          toast("Hay una nueva actualización", {
            id: ID_TOAST,
            description: "Actualizá para usar la última versión de Molinete.",
            duration: Infinity,
            action: { label: "Actualizar", onClick: () => window.location.reload() },
          })
        }
      } catch {
        // sin conexión: se vuelve a intentar en el próximo ciclo
      }
    }

    const intervalo = setInterval(revisar, CADA_MS)
    const alVolver = () => document.visibilityState === "visible" && void revisar()
    document.addEventListener("visibilitychange", alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener("visibilitychange", alVolver)
    }
  }, [])

  return null
}
