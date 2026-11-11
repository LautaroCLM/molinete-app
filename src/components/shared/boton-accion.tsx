"use client"

import { Button } from "@/components/ui/button"
import { usePanel, type AccionRapida } from "@/components/layout/panel-context"

/** Botón que abre una acción rápida (llegada, cobro, venta) desde cualquier pantalla. */
export function BotonAccion({
  accion,
  ...props
}: { accion: Exclude<AccionRapida, null> } & Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const { abrir } = usePanel()
  return <Button {...props} onClick={() => abrir(accion)} />
}
