import "server-only"
/**
 * Capa de acceso a datos (Supabase).
 *
 * Las pantallas SOLO importan desde acá. Todas las consultas usan la sesión del
 * usuario, así que la base (RLS) filtra por gimnasio y por rol: un gimnasio nunca
 * ve datos de otro, y recepción no ve totales ni movimientos ajenos.
 */
import { cache } from "react"
import { redirect } from "next/navigation"
import { differenceInCalendarDays, format, getDay, parseISO, startOfDay, startOfMonth, subDays } from "date-fns"
import { supabaseServer } from "@/lib/supabase/server"
import { calcularEstado, type EstadoSocio } from "@/lib/domain/cuota"
import { normalizar } from "@/lib/format"
import {
  mapCaja,
  mapGym,
  mapMovimiento,
  mapMovimientoStock,
  mapPlan,
  mapProducto,
  mapSocio,
  mapUsuario,
} from "./mappers"
import type {
  Caja,
  CategoriaMovimiento,
  EstadoCuota,
  Gym,
  MedioPago,
  Movimiento,
  Plan,
  Producto,
  RegistroAuditoria,
  Sesion,
  Socio,
  Usuario,
} from "@/types/domain"

export type { EstadoSocio }

const db = cache(supabaseServer)

/** PostgREST devuelve hasta 1000 filas por pedido: esto pagina hasta traer todo. */
async function todas<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  const PAGINA = 1000
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pedir(desde, desde + PAGINA - 1)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < PAGINA) return out
  }
}

/** Lanza si la consulta falló; las listas vacías llegan como []. */
function chequear<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error
  return (r.data ?? []) as T
}

// ---------- Sesión ----------
export const getSesion = cache(async (): Promise<Sesion> => {
  const sb = await db()
  const { data: claims } = await sb.auth.getClaims()
  const uid = claims?.claims?.sub
  if (!uid) redirect("/login")

  const { data: perfil } = await sb.from("perfiles").select("*, gym:gyms(*)").eq("id", uid).maybeSingle()

  if (!perfil || !perfil.gym) {
    // El administrador de la plataforma no tiene gimnasio: va a su panel.
    const { data: esAdmin } = await sb.rpc("es_superadmin")
    redirect(esAdmin === true ? "/admin" : "/auth/salir?motivo=singym")
  }
  if (!perfil.activo) redirect("/auth/salir?motivo=inactivo")

  const { gym, ...resto } = perfil
  return { usuario: mapUsuario(resto), gym: mapGym(gym) }
})

// ---------- Planes ----------
export const getPlanes = cache(async (): Promise<Plan[]> => {
  const sb = await db()
  const data = chequear(await sb.from("planes").select("*").order("created_at"))
  return data.map(mapPlan)
})

// ---------- Socios ----------
export interface SocioConEstado extends Socio {
  plan: Plan | undefined
  estado: EstadoSocio
}

export type FiltroSocios = "todos" | "activos" | "por_vencer" | "vencidos" | "inactivos"

const getSociosBase = cache(async (): Promise<SocioConEstado[]> => {
  const sb = await db()
  const [{ gym }, planes, filas] = await Promise.all([
    getSesion(),
    getPlanes(),
    todas((d, h) => sb.from("socios").select("*").order("apellido").order("nombre").range(d, h)),
  ])
  const planDe = new Map(planes.map((p) => [p.id, p]))
  return filas.map((f) => {
    const s = mapSocio(f)
    const plan = planDe.get(s.planId)
    return { ...s, plan, estado: calcularEstado(s, plan, gym.config) }
  })
})

export async function getSocios(filtro: FiltroSocios = "todos", busqueda = ""): Promise<SocioConEstado[]> {
  const q = normalizar(busqueda)
  return (await getSociosBase()).filter((s) => {
    const e = s.estado.estado
    if (filtro === "activos" && !s.activo) return false
    if (filtro === "por_vencer" && e !== "por_vencer") return false
    if (filtro === "vencidos" && !(e === "vencido" || e === "en_gracia")) return false
    if (filtro === "inactivos" && s.activo) return false
    if (q && !normalizar(`${s.nombre} ${s.apellido} ${s.apellido} ${s.nombre} ${s.dni}`).includes(q)) return false
    return true
  })
}

/** Índice liviano para la búsqueda rápida en el cliente (Ctrl+K y registro de llegada). */
export interface SocioIndice {
  id: string
  nombre: string
  apellido: string
  dni: string
  plan: string
  planId: string
  planTipo: Plan["tipo"] | undefined
  precioPlan: number
  estado: EstadoCuota
  resumen: string
  dias: number | null
  vinoHoy: boolean
  vencimiento: string | null
}

export async function getIndiceSocios(): Promise<SocioIndice[]> {
  const hoy = startOfDay(new Date())
  return (await getSociosBase()).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    apellido: s.apellido,
    dni: s.dni,
    plan: s.plan?.nombre ?? "Sin plan",
    planId: s.planId,
    planTipo: s.plan?.tipo,
    precioPlan: s.plan?.precio ?? 0,
    estado: s.estado.estado,
    resumen: s.estado.resumen,
    dias: s.estado.dias,
    vinoHoy: !!s.ultimaAsistencia && parseISO(s.ultimaAsistencia) >= hoy,
    vencimiento: s.vencimiento,
  }))
}

export async function getSocio(id: string) {
  const sb = await db()
  const socio = (await getSociosBase()).find((s) => s.id === id)
  if (!socio) return null
  const [pagosR, asistR, usuarios, planes] = await Promise.all([
    sb.from("pagos").select("*").eq("socio_id", id).order("fecha", { ascending: false }).limit(100),
    sb.from("asistencias").select("*").eq("socio_id", id).order("fecha", { ascending: false }).limit(400),
    getUsuarios(),
    getPlanes(),
  ])
  const pagos = chequear(pagosR).map((p) => ({
    id: p.id,
    monto: Number(p.monto),
    medio: p.medio as MedioPago,
    fecha: p.fecha,
    vencimientoHasta: p.vencimiento_hasta,
    plan: planes.find((x) => x.id === p.plan_id),
    usuario: usuarios.find((u) => u.id === p.usuario_id),
  }))
  const asistencias = chequear(asistR).map((a) => ({
    id: a.id,
    fecha: a.fecha,
    origen: a.origen as "recepcion" | "qr",
    usuarioId: a.usuario_id,
  }))
  const hace30 = subDays(new Date(), 30)
  const ultimos30 = asistencias.filter((a) => parseISO(a.fecha) >= hace30).length
  return { socio, pagos, asistencias, ultimos30 }
}

// ---------- Usuarios ----------
export const getUsuarios = cache(async (): Promise<Usuario[]> => {
  const sb = await db()
  return chequear(await sb.from("perfiles").select("*").order("created_at")).map(mapUsuario)
})

async function usuariosPorId() {
  return new Map((await getUsuarios()).map((u) => [u.id, u]))
}

// ---------- Asistencias ----------
export async function getAsistencias(opciones: { desde?: Date; hasta?: Date; limite?: number } = {}) {
  const sb = await db()
  const desde = opciones.desde ?? startOfDay(new Date())
  let q = sb
    .from("asistencias")
    .select("*")
    .gte("fecha", desde.toISOString())
    .order("fecha", { ascending: false })
    .limit(opciones.limite ?? 500)
  if (opciones.hasta) q = q.lte("fecha", opciones.hasta.toISOString())
  const [filas, socios, usuarios] = await Promise.all([q.then(chequear), getSociosBase(), usuariosPorId()])
  const socioDe = new Map(socios.map((s) => [s.id, s]))
  return filas
    .filter((a) => socioDe.has(a.socio_id))
    .map((a) => ({
      id: a.id,
      socioId: a.socio_id,
      fecha: a.fecha,
      origen: a.origen as "recepcion" | "qr",
      usuarioId: a.usuario_id,
      socio: socioDe.get(a.socio_id)!,
      usuario: a.usuario_id ? usuarios.get(a.usuario_id) : undefined,
    }))
}

export type AsistenciaDetalle = Awaited<ReturnType<typeof getAsistencias>>[number]

export async function contarAsistencias(desde: Date, hasta?: Date) {
  const sb = await db()
  let q = sb.from("asistencias").select("id", { count: "exact", head: true }).gte("fecha", desde.toISOString())
  if (hasta) q = q.lte("fecha", hasta.toISOString())
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

// ---------- Caja ----------
export interface ResumenCaja {
  caja: Caja
  usuario: Usuario | undefined
  ingresos: number
  egresos: number
  efectivoEsperado: number
  porMedio: Record<MedioPago, number>
  cantidad: number
}

const medioCero = (): Record<MedioPago, number> => ({ efectivo: 0, transferencia: 0, mercado_pago: 0, tarjeta: 0 })

async function resumirCajas(cajas: Caja[]): Promise<ResumenCaja[]> {
  if (cajas.length === 0) return []
  const sb = await db()
  const [movs, usuarios] = await Promise.all([
    todas((d, h) =>
      sb
        .from("movimientos")
        .select("*")
        .in(
          "caja_id",
          cajas.map((c) => c.id),
        )
        .is("anulado_at", null)
        .range(d, h),
    ),
    usuariosPorId(),
  ])
  return cajas.map((c) => {
    const propios = movs.filter((m) => m.caja_id === c.id).map(mapMovimiento)
    const porMedio = medioCero()
    let ingresos = 0,
      egresos = 0
    for (const m of propios) {
      porMedio[m.medio] += m.tipo === "ingreso" ? m.monto : -m.monto
      if (m.tipo === "ingreso") ingresos += m.monto
      else egresos += m.monto
    }
    return {
      caja: c,
      usuario: usuarios.get(c.usuarioId),
      ingresos,
      egresos,
      efectivoEsperado: c.montoInicial + porMedio.efectivo,
      porMedio,
      cantidad: propios.length,
    }
  })
}

export async function getCajaAbierta(usuarioId: string): Promise<ResumenCaja | null> {
  const sb = await db()
  const { data: fila, error } = await sb.from("cajas").select("*").eq("usuario_id", usuarioId).is("cierre", null).maybeSingle()
  if (error) throw error
  if (!fila) return null
  return (await resumirCajas([mapCaja(fila)]))[0]
}

export async function getCajasAbiertas(): Promise<ResumenCaja[]> {
  const sb = await db()
  const filas = chequear(await sb.from("cajas").select("*").is("cierre", null).order("apertura"))
  return resumirCajas(filas.map(mapCaja))
}

export async function getCajasCerradas(limite = 12): Promise<ResumenCaja[]> {
  const sb = await db()
  const filas = chequear(await sb.from("cajas").select("*").not("cierre", "is", null).order("apertura", { ascending: false }).limit(limite))
  return resumirCajas(filas.map(mapCaja))
}

export interface MovimientoDetalle extends Movimiento {
  usuario: Usuario | undefined
  anuladoPor: Usuario | undefined
}

export async function getMovimientos(opciones: { cajaId?: string; desde?: Date; hasta?: Date; limite?: number } = {}): Promise<MovimientoDetalle[]> {
  const sb = await db()
  let q = sb.from("movimientos").select("*").order("fecha", { ascending: false }).limit(opciones.limite ?? 500)
  if (opciones.cajaId) q = q.eq("caja_id", opciones.cajaId)
  if (opciones.desde) q = q.gte("fecha", opciones.desde.toISOString())
  if (opciones.hasta) q = q.lte("fecha", opciones.hasta.toISOString())
  const [filas, usuarios] = await Promise.all([q.then(chequear), usuariosPorId()])
  return filas.map((f) => {
    const m = mapMovimiento(f)
    return { ...m, usuario: usuarios.get(m.usuarioId), anuladoPor: m.anulacion ? usuarios.get(m.anulacion.usuarioId) : undefined }
  })
}

export interface Totales {
  ingresos: number
  egresos: number
  porMedio: Record<MedioPago, number>
  porCategoria: Partial<Record<CategoriaMovimiento, number>>
}

export async function getTotales(desde: Date, hasta: Date = new Date()): Promise<Totales> {
  const sb = await db()
  const filas = chequear(await sb.rpc("resumen_movimientos", { p_desde: desde.toISOString(), p_hasta: hasta.toISOString() }))
  const t: Totales = { ingresos: 0, egresos: 0, porMedio: medioCero(), porCategoria: {} }
  for (const f of filas ?? []) {
    const total = Number(f.total)
    const cat = f.categoria as CategoriaMovimiento
    if (f.tipo === "ingreso") {
      t.ingresos += total
      t.porMedio[f.medio as MedioPago] += total
    } else t.egresos += total
    t.porCategoria[cat] = (t.porCategoria[cat] ?? 0) + total
  }
  return t
}

// ---------- Inventario ----------
export const getProductos = cache(async (): Promise<Producto[]> => {
  const sb = await db()
  return chequear(await sb.from("productos").select("*").order("nombre")).map(mapProducto)
})

export async function getMovimientosStock(limite = 200) {
  const sb = await db()
  const [filas, productos, usuarios] = await Promise.all([
    sb.from("movimientos_stock").select("*").order("fecha", { ascending: false }).limit(limite).then(chequear),
    getProductos(),
    usuariosPorId(),
  ])
  const prod = new Map(productos.map((p) => [p.id, p]))
  return filas
    .map(mapMovimientoStock)
    .filter((m) => prod.has(m.productoId))
    .map((m) => ({ ...m, producto: prod.get(m.productoId)!, usuario: usuarios.get(m.usuarioId) }))
}

// ---------- Auditoría ----------
export async function getAuditoria(limite = 100): Promise<(RegistroAuditoria & { usuario: Usuario | undefined })[]> {
  const sb = await db()
  const [filas, usuarios] = await Promise.all([
    sb.from("auditoria").select("*").order("fecha", { ascending: false }).limit(limite).then(chequear),
    usuariosPorId(),
  ])
  return filas.map((a) => ({
    id: a.id,
    gym_id: a.gym_id,
    usuarioId: a.usuario_id ?? "",
    accion: a.accion,
    detalle: a.detalle,
    fecha: a.fecha,
    usuario: a.usuario_id ? usuarios.get(a.usuario_id) : undefined,
  }))
}

// ---------- Dashboard ----------
export async function getDashboard() {
  const sb = await db()
  const { usuario } = await getSesion()
  const esDueno = usuario.rol === "dueno"
  const ahora = new Date()
  const hoy = startOfDay(ahora)
  const inicioMes = startOfMonth(ahora)
  const hace28 = subDays(hoy, 28)

  const vacio: Totales = { ingresos: 0, egresos: 0, porMedio: medioCero(), porCategoria: {} }
  const [dia, mes, total, socios, asistHoy, asistAyer, porDiaR, ultimas4, productos, cajasAbiertas] = await Promise.all([
    esDueno ? getTotales(hoy) : vacio,
    esDueno ? getTotales(inicioMes) : vacio,
    esDueno ? getTotales(new Date(0)) : vacio,
    getSociosBase(),
    contarAsistencias(hoy),
    contarAsistencias(subDays(hoy, 1), subDays(ahora, 1)),
    esDueno ? sb.rpc("movimientos_por_dia", { p_desde: inicioMes.toISOString() }).then(chequear) : [],
    todas((d, h) => sb.from("asistencias").select("fecha").gte("fecha", hace28.toISOString()).range(d, h)),
    getProductos(),
    esDueno ? getCajasAbiertas() : Promise.resolve([] as ResumenCaja[]),
  ])

  const porDiaMap = new Map((porDiaR ?? []).map((r) => [r.dia, Number(r.ingresos)]))
  const diasMes = differenceInCalendarDays(hoy, inicioMes) + 1
  const ingresosPorDia = Array.from({ length: diasMes }, (_, i) => {
    const d = new Date(inicioMes)
    d.setDate(d.getDate() + i)
    const clave = format(d, "yyyy-MM-dd")
    return { dia: d.getDate(), fecha: clave, ingresos: porDiaMap.get(clave) ?? 0, domingo: getDay(d) === 0 }
  })

  // Asistencias por hora: hoy vs promedio del mismo día de la semana (últimas 4 semanas)
  const dow = getDay(ahora)
  const fechas = ultimas4.map((a) => parseISO(a.fecha))
  const porHora = Array.from({ length: 16 }, (_, i) => i + 7).map((h) => {
    const hoyN = fechas.filter((f) => f >= hoy && f.getHours() === h).length
    const previas = fechas.filter((f) => f < hoy && getDay(f) === dow && f.getHours() === h).length
    return { hora: `${h}`, hoy: h <= ahora.getHours() ? hoyN : null, promedio: Math.round((previas / 4) * 10) / 10 }
  })

  const porVencer = socios
    .filter((s) => s.estado.estado === "por_vencer" && s.estado.dias !== null)
    .sort((a, b) => (a.estado.dias ?? 0) - (b.estado.dias ?? 0))
  const vencidos = socios.filter((s) => s.estado.estado === "vencido" || s.estado.estado === "en_gracia")

  return {
    ingresos: { dia: dia.ingresos, mes: mes.ingresos, total: total.ingresos, mesEgresos: mes.egresos, diaPorMedio: dia.porMedio },
    asistenciasHoy: asistHoy,
    asistenciasAyer: asistAyer,
    sociosActivos: socios.filter((s) => s.activo).length,
    porVencer,
    vencidos,
    ingresosPorDia,
    porHora,
    stockBajo: productos.filter((p) => p.activo && p.stock <= p.stockMinimo),
    cajasViejas: cajasAbiertas.filter((c) => parseISO(c.caja.apertura) < hoy),
    efectivoEnCaja: cajasAbiertas.reduce((t, c) => t + c.efectivoEsperado, 0),
    cantidadCajasAbiertas: cajasAbiertas.length,
  }
}

// ---------- Reportes ----------
export async function getReportes(dias = 30) {
  const sb = await db()
  const { gym } = await getSesion()
  const ahora = new Date()
  const desde = startOfDay(subDays(ahora, dias - 1))
  const anteriorDesde = subDays(desde, dias)

  const [actual, anterior, porDiaR, calorR, totalAsistencias, socios, ventasR, productos] = await Promise.all([
    getTotales(desde),
    getTotales(anteriorDesde, desde),
    sb.rpc("movimientos_por_dia", { p_desde: desde.toISOString() }).then(chequear),
    sb.rpc("asistencias_dia_hora", { p_desde: desde.toISOString() }).then(chequear),
    contarAsistencias(desde),
    getSociosBase(),
    sb.rpc("ventas_por_producto", { p_desde: desde.toISOString() }).then(chequear),
    getProductos(),
  ])

  const porDiaMap = new Map((porDiaR ?? []).map((r) => [r.dia, r]))
  const porDia = Array.from({ length: dias }, (_, i) => {
    const clave = format(subDays(startOfDay(ahora), dias - 1 - i), "yyyy-MM-dd")
    const r = porDiaMap.get(clave)
    return { fecha: clave, ingresos: Number(r?.ingresos ?? 0), egresos: Number(r?.egresos ?? 0) }
  })

  const semanas = Math.max(1, dias / 7)
  const calor: { dia: number; hora: number; promedio: number }[] = []
  for (let d = 1; d <= 6; d++) {
    for (let h = 7; h <= 22; h++) {
      const n = (calorR ?? []).find((r) => r.dow === d && r.hora === h)?.cantidad ?? 0
      calor.push({ dia: d, hora: h, promedio: Math.round((n / semanas) * 10) / 10 })
    }
  }

  const limite = subDays(ahora, gym.config.diasInactividad)
  const dejaronDeVenir = socios
    .filter((s) => s.activo && s.ultimaAsistencia && parseISO(s.ultimaAsistencia) < limite)
    .sort((a, b) => (b.ultimaAsistencia ?? "").localeCompare(a.ultimaAsistencia ?? ""))

  const prod = new Map(productos.map((p) => [p.id, p]))
  const ganancias = (ventasR ?? [])
    .filter((v) => prod.has(v.producto_id))
    .map((v) => {
      const p = prod.get(v.producto_id)!
      const u = v.unidades
      return { producto: p, unidades: u, ingresos: u * p.precio, costo: u * p.costo, ganancia: u * (p.precio - p.costo) }
    })
    .filter((g) => g.unidades > 0)
    .sort((a, b) => b.ganancia - a.ganancia)

  return { dias, actual, anterior, porDia, calor, dejaronDeVenir, ganancias, totalAsistencias }
}

export type { Gym }

// ---------- Ingreso con QR ----------
export async function getConfigQR() {
  const sb = await db()
  const { gym } = await getSesion()
  const { data, error } = await sb.from("gyms").select("qr_token, qr_activo").eq("id", gym.id).single()
  if (error) throw error
  const hoy = startOfDay(new Date())
  const { count } = await sb
    .from("asistencias")
    .select("id", { count: "exact", head: true })
    .eq("origen", "qr")
    .gte("fecha", hoy.toISOString())
  return { token: data.qr_token, activo: data.qr_activo, ingresosHoy: count ?? 0 }
}
