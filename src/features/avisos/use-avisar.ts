"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { usePanel } from "@/components/layout/panel-context"
import { registrarAviso } from "@/lib/actions"
import { armarMensaje, cuandoCuota, enlaceWhatsApp, normalizarTelefono, PLANTILLA_POR_VENCER, PLANTILLA_VENCIDA, type TipoAviso } from "@/lib/whatsapp"
import type { EstadoCuota, TipoPlan } from "@/types/domain"

/** Lo mínimo de un socio para armar el aviso (viene del servidor, así que es un objeto simple). */
export interface SocioAviso {
  id: string
  nombre: string
  telefono: string
  plan: string
  estado: EstadoCuota
  dias: number | null
  vencimiento: string | null
  planTipo?: TipoPlan
  clases: number | null
}

/** Aviso de cuota por WhatsApp: se abre el chat con el mensaje escrito y queda registrado quién avisó. */
export function useAvisar() {
  const { gym } = usePanel()
  const [pendiente, start] = useTransition()

  /** null si no corresponde avisar (cuota al día, por clase…); si corresponde, indica si el teléfono sirve. */
  function aplica(s: SocioAviso): { tipo: TipoAviso; telefonoOk: boolean } | null {
    const c = cuandoCuota({ estado: s.estado, dias: s.dias, vencimiento: s.vencimiento, planTipo: s.planTipo, clases: s.clases })
    if (!c) return null
    return { tipo: c.tipo, telefonoOk: normalizarTelefono(s.telefono) !== null }
  }

  function avisar(s: SocioAviso) {
    const c = cuandoCuota({ estado: s.estado, dias: s.dias, vencimiento: s.vencimiento, planTipo: s.planTipo, clases: s.clases })
    const tel = normalizarTelefono(s.telefono)
    if (!c || !tel) return
    const plantilla = c.tipo === "por_vencer" ? (gym.msgPorVencer ?? PLANTILLA_POR_VENCER) : (gym.msgVencida ?? PLANTILLA_VENCIDA)
    const mensaje = armarMensaje(plantilla, { nombre: s.nombre.split(" ")[0], gimnasio: gym.nombre, plan: s.plan, cuando: c.cuando, vence: c.vence })
    window.open(enlaceWhatsApp(tel, mensaje), "_blank", "noopener,noreferrer")
    start(async () => {
      const r = await registrarAviso(s.id, c.tipo)
      if (r.ok) toast.success(`Aviso registrado: ${s.nombre}.`)
      else toast.error(r.error)
    })
  }

  return { aplica, avisar, pendiente }
}
