"use server"
/**
 * Ingreso con QR (público, sin login). Llama a las funciones públicas de la base
 * y traduce la respuesta a lo que se muestra en el celular del socio:
 * nombre de pila y estado de la cuota. Con el PIN del socio (perfil) devuelve además sus datos enmascarados, asistencias y pagos sin montos.
 */
import { format, parseISO } from "date-fns"
import { supabaseServer } from "@/lib/supabase/server"
import { calcularEstado } from "@/lib/domain/cuota"
import { rutinaSchema } from "@/lib/schemas"
import { esMusculo } from "@/lib/catalogo-ejercicios"
import type { MusculoPropio } from "@/lib/musculos"
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
export interface RutinaPerfil {
  id: string
  nombre: string
  descripcion: string
  /** true si la armó el propio socio (privada); false si se la asignó el gimnasio. */
  propia: boolean
  /** true si es una rutina del gimnasio abierta a todos los socios (no se la asignaron a este en particular). */
  del_gimnasio: boolean
  /** Índice (desde 0) del día que le toca hoy, por rotación. */
  hoy: number
  dias: { nombre: string; ejercicios: { nombre: string; series: string; repeticiones: string; descanso: string; nota: string; video: string }[] }[]
}

export interface EntrenamientoResumen {
  fecha: string
  rutina: string
  dia: string
  series: number
  volumen: number
  records: number
}

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
  /** Rutinas asignadas (las más recientes primero). */
  rutinas: RutinaPerfil[]
  /** Últimos entrenamientos registrados. */
  entrenamientos: EntrenamientoResumen[]
  /** Cuántos entrenamientos registró en los últimos 30 días. */
  entrenamientos30: number
  /** Semanas seguidas (lunes a domingo) con al menos una asistencia. */
  rachaSemanas: number
  /** Músculo de los ejercicios propios del gimnasio (no están en el catálogo de la app). */
  bibliotecaMusculos: MusculoPropio[]
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
  rutinas?: RutinaPerfil[]
  entrenamientos?: EntrenamientoResumen[]
  entrenamientos_30?: number
  racha_semanas?: number
  biblioteca_musculos?: { nombre: string; musculo: string }[]
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
      rutinas: r.rutinas ?? [],
      entrenamientos: r.entrenamientos ?? [],
      entrenamientos30: r.entrenamientos_30 ?? 0,
      rachaSemanas: r.racha_semanas ?? 0,
      bibliotecaMusculos: (r.biblioteca_musculos ?? []).flatMap((b) => (esMusculo(b.musculo) ? [{ nombre: b.nombre, musculo: b.musculo }] : [])),
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

// ---------- Registro de entrenamientos ----------
export interface HistorialEjercicio {
  fecha: string
  series: { peso: number | null; reps: number | null }[]
  mejorE1rm: number | null
  mejorPeso: number | null
}
/** Historial por ejercicio (clave: nombre en minúsculas): la última vez y las mejores marcas. */
export type Historial = Record<string, HistorialEjercicio>

export type ResultadoHistorial = { ok: true; historial: Historial } | { ok: false; codigo: string; mensaje: string }

export interface DatosEntrenamiento {
  clienteId: string
  rutinaId: string | null
  rutinaNombre: string
  diaNombre: string
  iniciadoEn: string
  ejercicios: { nombre: string; series: { peso: number | null; reps: number | null }[] }[]
}

export type ResultadoGuardado =
  | { ok: true; series: number; volumen: number; records: string[] }
  | { ok: false; codigo: string; mensaje: string }

const MSG_ENTRENO: Record<string, string> = {
  DATOS_INVALIDOS: "Revisá los pesos y las repeticiones: hay valores que no se pueden guardar.",
}

function falloEntreno(r: CrudoPerfil | null): { ok: false; codigo: string; mensaje: string } {
  const f = aPerfil(r ?? { ok: false, error: "ERROR" })
  const codigo = r?.error ?? "ERROR"
  if (!f.ok && MSG_ENTRENO[codigo]) return { ok: false, codigo, mensaje: MSG_ENTRENO[codigo] }
  return f.ok ? { ok: false, codigo, mensaje: "No pudimos guardar tu entrenamiento." } : { ok: false, codigo: f.codigo, mensaje: f.mensaje }
}

/** Trae la última vez y las mejores marcas de cada ejercicio (para precargar y detectar récords). */
export async function cargarHistorial(token: string, dispositivo: string, pin: string): Promise<ResultadoHistorial> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_entrenamiento_datos", { p_token: token, p_dispositivo: dispositivo, p_pin: pin })
  const r = data as unknown as (CrudoPerfil & { ejercicios?: Record<string, { fecha: string; series: { peso: number | null; reps: number | null }[]; mejor_e1rm: number | null; mejor_peso: number | null }> }) | null
  if (error || !r || !r.ok) return falloEntreno(error ? null : r)
  const historial: Historial = {}
  for (const [k, v] of Object.entries(r.ejercicios ?? {})) {
    historial[k] = { fecha: v.fecha, series: v.series ?? [], mejorE1rm: v.mejor_e1rm, mejorPeso: v.mejor_peso }
  }
  return { ok: true, historial }
}

/** Guarda un entrenamiento terminado. Es seguro reintentar: el mismo clienteId no se duplica. */
export async function guardarEntrenamiento(token: string, dispositivo: string, pin: string, datos: DatosEntrenamiento): Promise<ResultadoGuardado> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_entrenamiento_guardar", {
    p_token: token,
    p_dispositivo: dispositivo,
    p_pin: pin,
    p_datos: {
      cliente_id: datos.clienteId,
      rutina_id: datos.rutinaId,
      rutina_nombre: datos.rutinaNombre,
      dia_nombre: datos.diaNombre,
      iniciado_en: datos.iniciadoEn,
      ejercicios: datos.ejercicios,
    },
  })
  const r = data as unknown as (CrudoPerfil & { series?: number; volumen?: number; records?: string[] }) | null
  if (error || !r || !r.ok) return falloEntreno(error ? null : r)
  return { ok: true, series: r.series ?? 0, volumen: Number(r.volumen ?? 0), records: r.records ?? [] }
}

// ---------- Progreso por ejercicio ----------
export interface ProgresoEjercicio {
  nombre: string
  puntos: { fecha: string; peso: number | null; e1rm: number | null }[]
}
export type ResultadoProgreso = { ok: true; ejercicios: ProgresoEjercicio[] } | { ok: false; codigo: string; mensaje: string }

/** Evolución de cada ejercicio entrenado: por sesión, mejor peso y 1RM estimado. */
export async function cargarProgreso(token: string, dispositivo: string, pin: string): Promise<ResultadoProgreso> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_progreso", { p_token: token, p_dispositivo: dispositivo, p_pin: pin })
  const r = data as unknown as (CrudoPerfil & { ejercicios?: ProgresoEjercicio[] }) | null
  if (error || !r || !r.ok) return falloEntreno(error ? null : r)
  return { ok: true, ejercicios: r.ejercicios ?? [] }
}

// ---------- Rutinas propias del socio ----------
export type ResultadoRutinaPropia = { ok: true; id?: string } | { ok: false; codigo: string; mensaje: string }

export interface EjercicioBibliotecaSocio {
  nombre: string
  grupo: string
  video: string
}
export type ResultadoBiblioteca = { ok: true; ejercicios: EjercicioBibliotecaSocio[] } | { ok: false; codigo: string; mensaje: string }

export interface RecordEjercicio {
  nombre: string
  e1rm: number | null
  pesoE1rm: number | null
  repsE1rm: number | null
  fechaE1rm: string
  mejorPeso: number | null
  repsMejorPeso: number | null
  fechaMejorPeso: string
  records: number
  sesiones: number
}
export type ResultadoRecords = { ok: true; ejercicios: RecordEjercicio[] } | { ok: false; codigo: string; mensaje: string }

const MSG_RUTINA: Record<string, string> = {
  LIMITE_RUTINAS: "Ya tenés 10 rutinas propias. Borrá alguna para crear otra.",
  RUTINA_INEXISTENTE: "No encontramos esa rutina. Puede que ya la hayas borrado.",
}

function falloGeneral(r: (CrudoPerfil & { detalle?: string }) | null): { ok: false; codigo: string; mensaje: string } {
  const codigo = r?.error ?? "ERROR"
  if (codigo === "RUTINA_INVALIDA" && r?.detalle) return { ok: false, codigo, mensaje: r.detalle }
  if (MSG_RUTINA[codigo]) return { ok: false, codigo, mensaje: MSG_RUTINA[codigo] }
  const f = aPerfil(r ?? { ok: false, error: "ERROR" })
  return f.ok ? { ok: false, codigo, mensaje: "No pudimos completar la acción. Probá de nuevo." } : { ok: false, codigo: f.codigo, mensaje: f.mensaje }
}

/** Crea (o edita, con id) una rutina propia del socio. Es privada: el gimnasio no la ve. */
export async function guardarRutinaPropia(token: string, dispositivo: string, pin: string, datos: unknown, id?: string): Promise<ResultadoRutinaPropia> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const r = rutinaSchema.safeParse(datos)
  if (!r.success) return { ok: false, codigo: "RUTINA_INVALIDA", mensaje: r.error.issues[0]?.message ?? "Revisá los datos de la rutina." }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_rutina_guardar", { p_token: token, p_dispositivo: dispositivo, p_pin: pin, p_rutina: { ...r.data, id: id ?? null } })
  const res = data as unknown as (CrudoPerfil & { id?: string; detalle?: string }) | null
  if (error || !res || !res.ok) return falloGeneral(error ? null : res)
  return { ok: true, id: res.id }
}

export async function eliminarRutinaPropia(token: string, dispositivo: string, pin: string, id: string): Promise<ResultadoRutinaPropia> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_rutina_eliminar", { p_token: token, p_dispositivo: dispositivo, p_pin: pin, p_id: id })
  const res = data as unknown as CrudoPerfil | null
  if (error || !res || !res.ok) return falloGeneral(error ? null : res)
  return { ok: true }
}

/** Biblioteca del gimnasio: sugiere ejercicios y trae sus videos al armar una rutina propia. */
export async function cargarBiblioteca(token: string, dispositivo: string, pin: string): Promise<ResultadoBiblioteca> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_biblioteca", { p_token: token, p_dispositivo: dispositivo, p_pin: pin })
  const r = data as unknown as (CrudoPerfil & { ejercicios?: EjercicioBibliotecaSocio[] }) | null
  if (error || !r || !r.ok) return falloGeneral(error ? null : r)
  return { ok: true, ejercicios: r.ejercicios ?? [] }
}

export type ResultadoMusculos = { ok: true; ejercicios: { nombre: string; series: number }[] } | { ok: false; codigo: string; mensaje: string }

/** Series hechas por ejercicio en los últimos días: la app las cruza con el catálogo para saber qué músculos trabajó. */
export async function cargarMusculos(token: string, dispositivo: string, pin: string, dias: 7 | 30 | 90): Promise<ResultadoMusculos> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin) || ![7, 30, 90].includes(dias)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_series_por_ejercicio", { p_token: token, p_dispositivo: dispositivo, p_pin: pin, p_dias: dias })
  const r = data as unknown as (CrudoPerfil & { ejercicios?: { nombre: string; series: number }[] }) | null
  if (error || !r || !r.ok) return falloGeneral(error ? null : r)
  return { ok: true, ejercicios: (r.ejercicios ?? []).map((e) => ({ nombre: String(e.nombre), series: Number(e.series) })) }
}

/** Mejor marca de cada ejercicio: fuerza estimada y mayor peso, con su fecha. */
export async function cargarRecords(token: string, dispositivo: string, pin: string): Promise<ResultadoRecords> {
  if (!esDispositivo(dispositivo) || !/^\d{4}$/.test(pin)) return { ok: false, codigo: "DISPOSITIVO_DESCONOCIDO", mensaje: MENSAJES.DISPOSITIVO_DESCONOCIDO }
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("qr_records", { p_token: token, p_dispositivo: dispositivo, p_pin: pin })
  const r = data as unknown as (CrudoPerfil & { ejercicios?: Record<string, unknown>[] }) | null
  if (error || !r || !r.ok) return falloGeneral(error ? null : r)
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return {
    ok: true,
    ejercicios: (r.ejercicios ?? []).map((e) => ({
      nombre: String(e.nombre),
      e1rm: num(e.e1rm),
      pesoE1rm: num(e.peso_e1rm),
      repsE1rm: num(e.reps_e1rm),
      fechaE1rm: String(e.fecha_e1rm),
      mejorPeso: num(e.mejor_peso),
      repsMejorPeso: num(e.reps_mejor_peso),
      fechaMejorPeso: String(e.fecha_mejor_peso),
      records: Number(e.records ?? 0),
      sesiones: Number(e.sesiones ?? 0),
    })),
  }
}
