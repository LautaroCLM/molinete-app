"use server"
/**
 * Ingreso con QR (público, sin login). Llama a las funciones públicas de la base
 * y traduce la respuesta a lo que se muestra en el celular del socio:
 * nombre de pila y estado de la cuota. Con el PIN del socio (perfil) devuelve además sus datos enmascarados, asistencias y pagos sin montos.
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
  SIN_PIN: "Todavía no elegiste un PIN.",
  YA_TIENE_PIN: "Ya elegiste un PIN. Ingresalo para entrar.",
  PIN_INVALIDO: "El PIN son 4 números.",
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

/** Estado de la cuota con las frases que ve el socio. */
function describirCuota(r: Pick<Crudo, "plan_tipo" | "vencimiento" | "clases_restantes" | "dias_gracia">) {
  const { estado, resumen, dias } = calcularEstado(
    { activo: true, vencimiento: r.vencimiento ?? null, clasesRestantes: r.clases_restantes ?? null },
    r.plan_tipo ? { tipo: r.plan_tipo } : undefined,
    { diasGracia: r.dias_gracia ?? 0 },
  )
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
  return { estado, titulo, detalle, recordatorio }
}

function traducir(r: Crudo | null): ResultadoQR {
  if (!r || !r.ok) {
    const codigo = r?.error ?? "ERROR"
    return { ok: false, codigo, mensaje: MENSAJES[codigo] ?? "No pudimos registrar tu ingreso. Avisá en recepción.", nombre: r?.nombre }
  }
  const nombre = r.nombre ?? ""
  const { estado, titulo, detalle, recordatorio } = describirCuota(r)

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

// ---------- Perfil del socio (con PIN) ----------
export interface PerfilSocio {
  socioId: string
  nombre: string
  apellido: string
  plan: string | null
  estado: EstadoCuota
  titulo: string
  detalle: string
  recordatorio: string | null
  vencimiento: string | null
  fechaAlta: string
  /** Fechas de las asistencias de los últimos 120 días. */
  asistencias: string[]
  /** Cuántas veces vino en los últimos 30 días. */
  ultimos30: number
  /** Últimos pagos, sin montos. */
  pagos: { fecha: string; plan: string | null; hasta: string | null }[]
  dni: string | null
  telefono: string | null
  email: string | null
}

export type ResultadoPerfil =
  | { ok: true; perfil: PerfilSocio }
  | { ok: false; codigo: string; mensaje: string; restantes?: number; bloqueadoHasta?: string }

export type EstadoPerfil =
  | { ok: true; tienePin: boolean; bloqueadoHasta: string | null }
  | { ok: false; codigo: string; mensaje: string }

interface CrudoPerfil extends Crudo {
  socio_id?: string
  apellido?: string
  plan?: string | null
  fecha_alta?: string
  asistencias?: string[]
  pagos?: { fecha: string; plan: string | null; hasta: string | null }[]
  dni?: string | null
  telefono?: string | null
  email?: string | null
  restantes?: number
  bloqueado_hasta?: string
  tiene_pin?: boolean
}

const esDispositivo = (d: string) => /^[0-9a-f-]{36}$/i.test(d)

function mensajeBloqueo(hasta?: string) {
  if (!hasta) return "Demasiados intentos. Probá de nuevo más tarde."
  const min = Math.max(1, Math.ceil((new Date(hasta).getTime() - Date.now()) / 60000))
  const espera = min >= 120 ? `${Math.ceil(min / 60)} horas` : min >= 60 ? "1 hora" : `${min} ${min === 1 ? "minuto" : "minutos"}`
  return `Demasiados intentos. Probá de nuevo en ${espera} o pedí en recepción que restablezcan tu PIN.`
}

function aPerfil(r: CrudoPerfil | null): ResultadoPerfil {
  if (!r || !r.ok) {
    const codigo = r?.error ?? "ERROR"
    let mensaje = MENSAJES[codigo] ?? "No pudimos abrir tu perfil. Avisá en recepción."
    if (codigo === "PIN_INCORRECTO") mensaje = `PIN incorrecto. Te quedan ${r?.restantes ?? 0} ${r?.restantes === 1 ? "intento" : "intentos"}.`
    if (codigo === "BLOQUEADO") mensaje = mensajeBloqueo(r?.bloqueado_hasta)
    return { ok: false, codigo, mensaje, restantes: r?.restantes, bloqueadoHasta: r?.bloqueado_hasta }
  }
  const { estado, titulo, detalle, recordatorio } = describirCuota(r)
  return {
    ok: true,
    perfil: {
      socioId: r.socio_id ?? "",
      nombre: r.nombre ?? "",
      apellido: r.apellido ?? "",
      plan: r.plan ?? null,
      estado,
      titulo,
      detalle,
      recordatorio,
      vencimiento: r.vencimiento ?? null,
      fechaAlta: r.fecha_alta ?? "",
      asistencias: r.asistencias ?? [],
      ultimos30: (r.asistencias ?? []).filter((a) => new Date(a).getTime() >= Date.now() - 30 * 24 * 3600e3).length,
      pagos: r.pagos ?? [],
      dni: r.dni ?? null,
      telefono: r.telefono ?? null,
      email: r.email ?? null,
    },
  }
}

/** ¿Ya eligió un PIN? ¿Está bloqueado? */
export async function estadoPerfil(token: string, dispositivo: string): Promise<EstadoPerfil> {
  if (!esDispositivo(dispositivo)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_perfil_estado", { p_token: token, p_dispositivo: dispositivo })
  const r = data as unknown as CrudoPerfil | null
  if (error || !r || !r.ok) {
    const codigo = r?.error ?? "ERROR"
    return { ok: false, codigo, mensaje: MENSAJES[codigo] ?? "No pudimos abrir tu perfil. Avisá en recepción." }
  }
  return { ok: true, tienePin: !!r.tiene_pin, bloqueadoHasta: r.bloqueado_hasta ?? null }
}

/** Primera vez: elige su PIN y entra. */
export async function crearPin(token: string, dispositivo: string, pin: string): Promise<ResultadoPerfil> {
  if (!esDispositivo(dispositivo)) return aPerfil({ ok: false, error: "DISPOSITIVO_DESCONOCIDO" })
  if (!/^\d{4}$/.test(pin)) return aPerfil({ ok: false, error: "PIN_INVALIDO" })
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_pin_crear", { p_token: token, p_dispositivo: dispositivo, p_pin: pin })
  return aPerfil(error ? null : (data as unknown as CrudoPerfil))
}

/** Entra a su perfil con el PIN. */
export async function abrirPerfil(token: string, dispositivo: string, pin: string): Promise<ResultadoPerfil> {
  if (!esDispositivo(dispositivo)) return aPerfil({ ok: false, error: "DISPOSITIVO_DESCONOCIDO" })
  if (!/^\d{4}$/.test(pin)) return aPerfil({ ok: false, error: "PIN_INVALIDO" })
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_perfil", { p_token: token, p_dispositivo: dispositivo, p_pin: pin })
  return aPerfil(error ? null : (data as unknown as CrudoPerfil))
}
