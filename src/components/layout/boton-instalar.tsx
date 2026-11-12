"use client"

import { useSyncExternalStore } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { instalarApp, puedeInstalar, suscribirInstalacion } from "@/lib/pwa"

function usePuedeInstalar() {
  return useSyncExternalStore(suscribirInstalacion, puedeInstalar, () => false)
}

async function instalar() {
  const ok = await instalarApp()
  if (ok) toast.success("Listo: Molinete se instaló en este dispositivo.")
}

/** Opción del menú de usuario: aparece solo si el navegador permite instalar la app. */
export function ItemInstalarApp() {
  if (!usePuedeInstalar()) return null
  return (
    <DropdownMenuItem onSelect={() => void instalar()}>
      <Download /> Instalar la app
    </DropdownMenuItem>
  )
}

/** Botón suelto (por ejemplo en el ingreso). */
export function BotonInstalarApp({ className }: { className?: string }) {
  if (!usePuedeInstalar()) return null
  return (
    <Button type="button" variant="outline" className={className} onClick={() => void instalar()}>
      <Download /> Instalar la app en este celular
    </Button>
  )
}
