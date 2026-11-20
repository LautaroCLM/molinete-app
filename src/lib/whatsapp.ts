/** Avisos de cuota por WhatsApp con un clic (wa.me): teléfonos, mensajes y enlaces. Funciones puras. */
import { format, parseISO } from "date-fns"
import type { EstadoCuota, TipoPlan } from "@/types/domain"

export const PLANTILLA_POR_VENCER =
  "Hola {nombre}! Te escribimos de {gimnasio}. Tu cuota {cuando}. Cuando quieras pasá por recepción para renovarla. ¡Te esperamos!"
export const PLANTILLA_VENCIDA =
  "Hola {nombre}! Te escribimos de {gimnasio}. Tu cuota {cuando}. Pasá por recepción para renovarla y seguir entrenando. ¡Te esperamos!"

export const VARIABLES_MENSAJE = ["{nombre}", "{gimnasio}", "{plan}", "{cuando}", "{vence}"] as const

export type TipoAviso = "por_vencer" | "vencida"

/**
 * Teléfono argentino a formato internacional de WhatsApp (549 + área + número, sin 0 ni 15).
 * Devuelve null si no se puede interpretar como un celular de 10 dígitos.
 */
export function normalizarTelefono(texto: string): string | null {
  let d = texto.replace(/\D/g, "")
  if (d.startsWith("54")) d = d.slice(2)
  if (d.startsWith("9") && d.length === 11) d = d.slice(1)
  d = d.replace(/^0/, "")
  if (d.length > 10) {
    // celulares escritos con 15: área (2 a 4 dígitos) + 15 + número
    const m = d.match(/^(\d{2,4})15(\d{6,8})$/)
    if (m && m[1].length + m[2].length === 10) d = m[1] + m[2]
  }
  return d.length === 10 ? `549${d}` : null
}

export interface CuotaAviso {
  estado: EstadoCuota
  dias: number | null
  vencimiento: string | null
  planTipo?: TipoPlan
  clases: number | null
}

/** ¿Corresponde avisar? Devuelve el tipo de aviso y la frase que completa "Tu cuota …". */
export function cuandoCuota(c: CuotaAviso): { tipo: TipoAviso; cuando: string; vence: string } | null {
  const dd = (v: string) => format(parseISO(v), "dd/MM")
  if (c.planTipo === "paquete") {
    if (c.estado === "por_vencer") return { tipo: "por_vencer", cuando: `está por terminarse: te quedan ${c.clases ?? 0} ${c.clases === 1 ? "clase" : "clases"}`, vence: "" }
    if (c.estado === "vencido") return { tipo: "vencida", cuando: "se terminó: no te quedan clases", vence: "" }
    return null
  }
  if (!c.vencimiento || c.dias === null) return null
  const fecha = dd(c.vencimiento)
  if (c.estado === "por_vencer") {
    const cuando = c.dias === 0 ? `vence hoy (${fecha})` : c.dias === 1 ? `vence mañana (${fecha})` : `vence en ${c.dias} días (${fecha})`
    return { tipo: "por_vencer", cuando, vence: fecha }
  }
  if (c.estado === "en_gracia" || c.estado === "vencido") {
    const hace = -c.dias
    return { tipo: "vencida", cuando: `venció ${hace === 1 ? "ayer" : `hace ${hace} días`} (${fecha})`, vence: fecha }
  }
  return null
}

export function armarMensaje(plantilla: string, v: { nombre: string; gimnasio: string; plan: string; cuando: string; vence: string }): string {
  const datos: Record<string, string> = { nombre: v.nombre, gimnasio: v.gimnasio, plan: v.plan, cuando: v.cuando, vence: v.vence }
  return plantilla.replace(/\{(nombre|gimnasio|plan|cuando|vence)\}/g, (_, k: string) => datos[k] ?? "").replace(/\s+([.,!])/g, "$1")
}

export function enlaceWhatsApp(telefonoNormalizado: string, mensaje: string): string {
  return `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensaje)}`
}
