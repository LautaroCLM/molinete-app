"use server"
/**
 * Ingreso con QR (público, sin login). Llama a las funciones públicas de la base
 * y traduce la respuesta a lo que se muestra en el celular del socio:
 * nombre de pila y estado de la cuota. Nunca devuelve otros datos personales.
 */
import { format, parseISO } from "date-fns"
import { supabaseServer } from "@/lib/supabase/server"
import { calcularEstado } from "@/lib/domain/cuota"
import { revalidatePath } from "next/cache"
import type { EstadoCuota, TipoPlan } from "@/types/domain"

export type ResultadoQR =
  | {
      ok: true
      dispositivo: string
      nombre: string
      estado: EstadoCuota
      titulo: string
      detalle: string
      recordatorio: string | null
      yaRegistrado: boolean
      hora: string
    }
  | { ok: false; codigo: string; mensaje: string; nombre?: string }

const MENSAJES: Record<string, string> = {
  QR_INVALIDO: "Este QR ya no funciona. Pedí el nuevo en recepción.",
  QR_INACTIVO: "El ingreso con QR está pausado. Avisá en recepción que llegaste.",
  NO_ENCONTRADO: "No encontramos ese DNI. Revisalo o consultá en recepción.",
  DEMASIADOS_INTENTOS: "Hubo demasiados intentos. Esperá unos minutos o avisá en recepción.",
  DISPOSITIVO_DESCONOCIDO: "Necesitamos tu DNI de nuevo.",
  INACTIVO: "Tu cuenta no está activa. Pasá por recepción.",
}

interface Crudo {
  ok: boolean
  error?: string
  dispositivo?: string
  nombre?: string
  plan_tipo?: TipoPlan | null
  vencimiento?: string | null
  clases_restantes?: number | null
  dias_gracia?: number
  ya_registrado?: boolean
  hora?: string
}

function traducir(r: Crudo | null): ResultadoQR {
  if (!r || !r.ok) {
    const codigo = r?.error ?? "ERROR"
    return { ok: false, codigo, mensaje: MENSAJES[codigo] ?? "No pudimos registrar tu ingreso. Avisá en recepción.", nombre: r?.nombre }
  }
  const { estado, resumen, dias } = calcularEstado(
    { activo: true, vencimiento: r.vencimiento ?? null, clasesRestantes: r.clases_restantes ?? null },
    r.plan_tipo ? { tipo: r.plan_tipo } : undefined,
    { diasGracia: r.dias_gracia ?? 0 },
  )
  const nombre = r.nombre ?? ""
  let titulo = "Al día"
  let detalle = resumen
  let recordatorio: string | null = null

  if (estado === "al_dia") {
    titulo = "Al día"
    detalle = r.plan_tipo === "paquete" ? resumen : `Te quedan ${dias} días de cuota.`
  } else if (estado === "por_vencer") {
    titulo = "Por vencer"
    detalle = r.plan_tipo === "paquete" ? resumen : `${resumen}.`
    recordatorio = "Podés renovarla en recepción."
  } else if (estado === "en_gracia" || estado === "vencido") {
    titulo = "Cuota vencida"
    detalle = r.plan_tipo === "paquete" ? "No te quedan clases." : `${resumen}.`
    recordatorio = "Pasá por recepción para renovarla."
  } else if (estado === "por_clase") {
    titulo = "Clase suelta"
    detalle = "Pagás por clase."
    recordatorio = "Acordate de abonar en recepción."
  }

  return {
    ok: true,
    dispositivo: r.dispositivo ?? "",
    nombre,
    estado,
    titulo,
    detalle,
    recordatorio,
    yaRegistrado: !!r.ya_registrado,
    hora: r.hora ? format(parseISO(r.hora), "HH:mm") : "",
  }
}

export async function ingresarConDni(token: string, dni: string): Promise<ResultadoQR> {
  const limpio = dni.replace(/\D/g, "")
  if (limpio.length < 7 || limpio.length > 8) return { ok: false, codigo: "DNI", mensaje: "Ingresá tu DNI sin puntos (7 u 8 números)." }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_vincular", { p_token: token, p_dni: limpio })
  if (error) return traducir(null)
  revalidatePath("/", "layout")
  return traducir(data as unknown as Crudo)
}

export async function ingresarConDispositivo(token: string, dispositivo: string): Promise<ResultadoQR> {
  if (!/^[0-9a-f-]{36}$/i.test(dispositivo)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_ingresar", { p_token: token, p_dispositivo: dispositivo })
  if (error) return traducir(null)
  revalidatePath("/", "layout")
  return traducir(data as unknown as Crudo)
}

export async function desvincularDispositivo(dispositivo: string) {
  if (!/^[0-9a-f-]{36}$/i.test(dispositivo)) return
  const sb = await supabaseServer()
  await sb.rpc("qr_desvincular", { p_dispositivo: dispositivo })
}
