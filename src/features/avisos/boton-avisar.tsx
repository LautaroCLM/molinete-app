"use client"

import { useState } from "react"
import { Check, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hace } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useAvisar, type SocioAviso } from "./use-avisar"

const SIETE_DIAS = 7 * 86400e3

/** "Avisado hace 2 días"; si fue hace menos de un minuto, "Avisado recién". */
function textoAvisado(iso: string, ahora: number) {
  return Math.abs(ahora - new Date(iso).getTime()) < 60_000 || new Date(iso).getTime() > ahora ? "Avisado recién" : `Avisado ${hace(iso)}`
}

/** Botón "Avisar": abre WhatsApp con el aviso de cuota. Solo aparece si el socio está por vencer o vencido. */
export function BotonAvisar({
  socio,
  ultimoAviso,
  variant = "outline",
  size = "sm",
  compacto = false,
  className,
}: {
  socio: SocioAviso
  ultimoAviso?: string | null
  variant?: "outline" | "default" | "ghost"
  size?: "sm" | "default" | "lg"
  /** Solo el ícono (para listas angostas). */
  compacto?: boolean
  className?: string
}) {
  const { aplica, avisar, pendiente } = useAvisar()
  const [ahora] = useState(() => Date.now())
  const a = aplica(socio)
  if (!a) return null

  const reciente = !!ultimoAviso && ahora - new Date(ultimoAviso).getTime() < SIETE_DIAS
  return (
    <Button
      type="button"
      variant={variant}
      size={compacto ? "icon-sm" : size}
      aria-label={compacto ? (reciente ? textoAvisado(ultimoAviso!, ahora) : "Avisar por WhatsApp") : undefined}
      className={cn(reciente && "text-muted-foreground", className)}
      disabled={pendiente || !a.telefonoOk}
      title={a.telefonoOk ? (reciente ? "Ya se le avisó: tocá para avisar de nuevo" : "Abre WhatsApp con el mensaje escrito") : "El teléfono no sirve para WhatsApp: revisalo en su ficha"}
      onClick={() => avisar(socio)}
    >
      {reciente ? <Check /> : <MessageCircle />}
      {!compacto && (!a.telefonoOk ? "Sin teléfono" : reciente ? textoAvisado(ultimoAviso!, ahora) : "Avisar")}
    </Button>
  )
}
