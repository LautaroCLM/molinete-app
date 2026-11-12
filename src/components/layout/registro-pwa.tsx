"use client"

import { useEffect } from "react"
import { iniciarPWA } from "@/lib/pwa"

/** Registra el service worker (solo en producción) y empieza a escuchar el aviso de instalación. */
export function RegistroPWA() {
  useEffect(() => {
    iniciarPWA()
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // sin service worker la web funciona igual; solo no se podrá instalar
    })
  }, [])
  return null
}
