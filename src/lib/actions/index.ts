"use server"
/**
 * Acciones del servidor (mutaciones). Validan con zod, escriben en Supabase con la
 * sesión del usuario y refrescan las pantallas. Las reglas de negocio de dinero y
 * stock (caja abierta, permisos, auditoría) viven en funciones de la base, así que
 * no se pueden saltear llamando a la API directamente.
 */
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { z } from "zod"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getSesion } from "@/lib/data"
import { puede, type Permiso } from "@/lib/permissions"
import {
  ajusteStockSchema,
  anulacionSchema,
  aperturaCajaSchema,
  cierreCajaSchema,
  cobroSchema,
  contrasenaSchema,
  gimnasioSchema,
  loginSchema,
  movimientoSchema,
  planSchema,
  productoSchema,
  registroSchema,
  reglasSchema,
  socioSchema,
  usuarioInvitacionSchema,
  ventaSchema,
  type ResultadoAccion,
} from "@/lib/schemas"
import type { Rol } from "@/types/domain"

// ---------- Utilidades ----------
const ERRORES: Record<string, string> = {
  SIN_SESION: "Tu sesión venció. Volvé a ingresar.",
  SIN_CAJA: "No tenés una caja abierta. Abrí la caja antes de cobrar.",
  CAJA_YA_ABIERTA: "Ya tenés una caja abierta.",
  CAJA_INEXISTENTE: "La caja ya está cerrada o no existe.",
  SIN_PERMISO: "No tenés permiso para hacer esto.",
  SIN_STOCK: "No hay stock suficiente",
  SOCIO_INEXISTENTE: "No encontramos al socio.",
  PLAN_INEXISTENTE: "El plan no existe o está desactivado.",
  PRODUCTO_INEXISTENTE: "El producto no existe o está desactivado.",
  YA_ANULADO: "Ese movimiento ya estaba anulado.",
  YA_TIENE_GIMNASIO: "Tu usuario ya pertenece a un gimnasio.",
  CUOTA_SOLO_POR_COBRO: "El vencimiento cambia solo al cobrar. Pedile al dueño si hay que corregirlo.",
  STOCK_SOLO_POR_MOVIMIENTO: "El stock se modifica con un movimiento de stock.",
  MONTO_INVALIDO: "El monto tiene que ser mayor a cero.",
}

function traducir(error: { message?: string; code?: string; details?: string | null } | null | undefined): string {
  if (!error) return "Algo salió mal. Probá de nuevo."
  const msg = error.message ?? ""
  if (error.code === "23505") {
    if (msg.includes("dni")) return "Ya hay un socio con ese DNI."
    return "Ese dato ya existe."
  }
  if (error.code === "42501") return ERRORES.SIN_PERMISO
  const clave = Object.keys(ERRORES).find((k) => msg.includes(k))
  if (clave === "SIN_STOCK" && error.details) return `${ERRORES.SIN_STOCK} de ${error.details}.`
  return clave ? ERRORES[clave] : "Algo salió mal. Probá de nuevo."
}

function invalido<T extends z.ZodType>(r: z.ZodSafeParseResult<z.output<T>>): ResultadoAccion<never> | null {
  return r.success ? null : { ok: false, error: r.error.issues[0]?.message ?? "Revisá los datos ingresados." }
}

async function exigir(permiso: Permiso) {
  const sesion = await getSesion()
  if (!puede(sesion.usuario.rol, permiso)) throw new Error("SIN_PERMISO")
  return sesion
}

function refrescar() {
  revalidatePath("/", "layout")
}

async function origen() {
  const h = await headers()
  return h.get("origin") ?? `http://${h.get("host") ?? "localhost:3000"}`
}

// ---------- Autenticación ----------
export async function iniciarSesion(datos: unknown, volver = "/"): Promise<ResultadoAccion> {
  const r = loginSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { error } = await sb.auth.signInWithPassword(r.data)
  if (error) return { ok: false, error: "El email o la contraseña no son correctos." }
  await sb.rpc("registrar_acceso")
  redirect(volver.startsWith("/") && !volver.startsWith("//") ? volver : "/")
}

export async function registrarGimnasio(datos: unknown): Promise<ResultadoAccion> {
  const r = registroSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { data, error } = await sb.auth.signUp({
    email: r.data.email,
    password: r.data.password,
    options: {
      // Si el proyecto pide confirmar el email, el gimnasio se crea en el primer ingreso con estos datos.
      data: { nombre_gym: r.data.nombreGym, nombre: r.data.nombre, apellido: r.data.apellido },
      emailRedirectTo: `${await origen()}/auth/confirmar?next=/`,
    },
  })
  if (error) {
    if (error.code === "user_already_exists") return { ok: false, error: "Ya existe una cuenta con ese email. Ingresá desde el login." }
    if (error.code === "weak_password") return { ok: false, error: "Elegí una contraseña más segura." }
    return { ok: false, error: "No pudimos crear la cuenta. Probá de nuevo." }
  }
  if (!data.session) return { ok: true } // hay que confirmar el email
  const { error: e2 } = await sb.rpc("crear_gimnasio", {
    p_nombre_gym: r.data.nombreGym,
    p_nombre: r.data.nombre,
    p_apellido: r.data.apellido,
  })
  if (e2) return { ok: false, error: traducir(e2) }
  redirect("/")
}

export async function recuperarContrasena(email: string): Promise<ResultadoAccion> {
  const sb = await supabaseServer()
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await origen()}/bienvenida` })
  // Siempre OK: no revelamos si el email existe.
  return { ok: true }
}

export async function definirContrasena(datos: unknown): Promise<ResultadoAccion> {
  const r = contrasenaSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { error } = await sb.auth.updateUser({ password: r.data.password })
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Elegí una contraseña distinta a la anterior." }
    return { ok: false, error: "El enlace venció. Pedí uno nuevo." }
  }
  await sb.rpc("registrar_acceso")
  redirect("/")
}

export async function cerrarSesion() {
  const sb = await supabaseServer()
  await sb.auth.signOut()
  redirect("/login")
}

// ---------- Socios ----------
export async function guardarSocio(datos: unknown, id?: string): Promise<ResultadoAccion<{ id: string }>> {
  const r = socioSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const { gym } = await getSesion()
  const sb = await supabaseServer()
  const fila = {
    nombre: r.data.nombre,
    apellido: r.data.apellido,
    dni: r.data.dni,
    telefono: r.data.telefono,
    email: r.data.email,
    fecha_alta: r.data.fechaAlta,
    plan_id: r.data.planId,
    observaciones: r.data.observaciones,
  }
  const res = id
    ? await sb.from("socios").update(fila).eq("id", id).select("id").single()
    : await sb.from("socios").insert({ ...fila, gym_id: gym.id }).select("id").single()
  if (res.error) return { ok: false, error: traducir(res.error) }
  refrescar()
  return { ok: true, data: { id: res.data.id } }
}

export async function cambiarEstadoSocio(id: string, activo: boolean): Promise<ResultadoAccion> {
  const sb = await supabaseServer()
  const { error } = await sb.from("socios").update({ activo }).eq("id", id)
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

// ---------- Cobros y asistencias ----------
export async function registrarCobro(datos: unknown): Promise<ResultadoAccion<{ vencimientoHasta: string | null }>> {
  const r = cobroSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("cobrar", {
    p_socio: r.data.socioId,
    p_plan: r.data.planId,
    p_monto: r.data.monto,
    p_medio: r.data.medio,
  })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  const venc = (data as { vencimiento_hasta: string | null } | null)?.vencimiento_hasta ?? null
  return { ok: true, data: { vencimientoHasta: venc } }
}

export async function registrarAsistencia(socioId: string): Promise<ResultadoAccion> {
  if (!socioId) return { ok: false, error: "Elegí un socio." }
  const sb = await supabaseServer()
  const { error } = await sb.rpc("registrar_asistencia", { p_socio: socioId })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

// ---------- Ventas e inventario ----------
export async function registrarVenta(datos: unknown): Promise<ResultadoAccion> {
  const r = ventaSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { error } = await sb.rpc("vender", { p_items: r.data.items, p_medio: r.data.medio })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

export async function guardarProducto(datos: unknown, id?: string): Promise<ResultadoAccion> {
  const r = productoSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  try {
    const { gym } = await exigir("productos.editar")
    const sb = await supabaseServer()
    const fila = {
      nombre: r.data.nombre,
      categoria: r.data.categoria,
      costo: r.data.costo,
      precio: r.data.precio,
      stock_minimo: r.data.stockMinimo,
    }
    if (id) {
      const { error } = await sb.from("productos").update(fila).eq("id", id)
      if (error) return { ok: false, error: traducir(error) }
    } else {
      const { data, error } = await sb.from("productos").insert({ ...fila, gym_id: gym.id, stock: 0 }).select("id").single()
      if (error) return { ok: false, error: traducir(error) }
      if (r.data.stock > 0) {
        const { error: e2 } = await sb.rpc("ajustar_stock", { p_producto: data.id, p_tipo: "entrada", p_cantidad: r.data.stock, p_nota: "Stock inicial" })
        if (e2) return { ok: false, error: traducir(e2) }
      }
    }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

export async function ajustarStock(datos: unknown): Promise<ResultadoAccion> {
  const r = ajusteStockSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { error } = await sb.rpc("ajustar_stock", {
    p_producto: r.data.productoId,
    p_tipo: r.data.tipo,
    p_cantidad: r.data.cantidad,
    p_nota: r.data.nota,
  })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

// ---------- Caja ----------
export async function abrirCaja(datos: unknown): Promise<ResultadoAccion> {
  const r = aperturaCajaSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { error } = await sb.rpc("abrir_caja", { p_monto_inicial: r.data.montoInicial, p_observaciones: r.data.observaciones ?? "" })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

export async function cerrarCaja(datos: unknown): Promise<ResultadoAccion<{ diferencia: number }>> {
  const r = cierreCajaSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc("cerrar_caja", {
    p_caja: r.data.cajaId,
    p_monto_contado: r.data.montoContado,
    p_observaciones: r.data.observaciones ?? "",
  })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true, data: { diferencia: Number(data) } }
}

export async function registrarMovimiento(datos: unknown): Promise<ResultadoAccion> {
  const r = movimientoSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { error } = await sb.rpc("registrar_movimiento", {
    p_tipo: r.data.tipo,
    p_categoria: r.data.categoria,
    p_monto: r.data.monto,
    p_medio: r.data.medio,
    p_descripcion: r.data.descripcion,
    p_sin_caja: r.data.sinCaja,
  })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

export async function anularMovimiento(datos: unknown): Promise<ResultadoAccion> {
  const r = anulacionSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  const sb = await supabaseServer()
  const { error } = await sb.rpc("anular_movimiento", { p_movimiento: r.data.movimientoId, p_motivo: r.data.motivo })
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

// ---------- Configuración ----------
export async function guardarGimnasio(datos: unknown): Promise<ResultadoAccion> {
  const r = gimnasioSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  try {
    const { gym } = await exigir("configuracion.ver")
    const sb = await supabaseServer()
    const { error } = await sb.from("gyms").update(r.data).eq("id", gym.id)
    if (error) return { ok: false, error: traducir(error) }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

export async function guardarReglas(datos: unknown): Promise<ResultadoAccion> {
  const r = reglasSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  try {
    const { gym } = await exigir("configuracion.ver")
    const sb = await supabaseServer()
    const { error } = await sb
      .from("gyms")
      .update({
        venc_tipo: r.data.vencTipo,
        venc_dias: r.data.vencDias,
        venc_dia: r.data.vencDia,
        dias_gracia: r.data.diasGracia,
        dias_inactividad: r.data.diasInactividad,
      })
      .eq("id", gym.id)
    if (error) return { ok: false, error: traducir(error) }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

export async function guardarPlan(datos: unknown, id?: string): Promise<ResultadoAccion> {
  const r = planSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  try {
    const { gym } = await exigir("configuracion.ver")
    const sb = await supabaseServer()
    const fila = {
      nombre: r.data.nombre,
      tipo: r.data.tipo,
      precio: r.data.precio,
      duracion_dias: r.data.tipo === "mensual" ? 30 : (r.data.duracionDias ?? null),
      cantidad_clases: r.data.cantidadClases ?? null,
    }
    const { error } = id ? await sb.from("planes").update(fila).eq("id", id) : await sb.from("planes").insert({ ...fila, gym_id: gym.id })
    if (error) return { ok: false, error: traducir(error) }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

export async function cambiarEstadoPlan(id: string, activo: boolean): Promise<ResultadoAccion> {
  const sb = await supabaseServer()
  const { error } = await sb.from("planes").update({ activo }).eq("id", id)
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}

// ---------- Usuarios ----------
export async function invitarUsuario(datos: unknown): Promise<ResultadoAccion> {
  const r = usuarioInvitacionSchema.safeParse(datos)
  if (!r.success) return invalido(r)!
  try {
    const { gym } = await exigir("usuarios.gestionar")
    const admin = supabaseAdmin()
    const [nombre, ...resto] = r.data.nombre.split(" ")
    const { data, error } = await admin.auth.admin.inviteUserByEmail(r.data.email, {
      data: { nombre: r.data.nombre },
      redirectTo: `${await origen()}/bienvenida`,
    })
    if (error) {
      if (error.code === "email_exists" || error.message.includes("already been registered"))
        return { ok: false, error: "Ese email ya tiene una cuenta en Molinete." }
      return { ok: false, error: "No pudimos enviar la invitación. Probá de nuevo." }
    }
    const { error: e2 } = await admin.from("perfiles").insert({
      id: data.user.id,
      gym_id: gym.id,
      nombre,
      apellido: resto.join(" "),
      email: r.data.email,
      rol: r.data.rol,
      invitacion_pendiente: true,
    })
    if (e2) return { ok: false, error: traducir(e2) }
    const sb = await supabaseServer()
    await admin.from("auditoria").insert({
      gym_id: gym.id,
      usuario_id: (await sb.auth.getUser()).data.user?.id ?? null,
      accion: "Invitó usuario",
      detalle: `${r.data.email} como ${r.data.rol === "dueno" ? "Dueño" : "Recepción"}`,
    })
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

export async function reenviarInvitacion(usuarioId: string): Promise<ResultadoAccion> {
  try {
    const { gym } = await exigir("usuarios.gestionar")
    const admin = supabaseAdmin()
    const { data: perfil } = await admin.from("perfiles").select("email, gym_id, invitacion_pendiente").eq("id", usuarioId).single()
    if (!perfil || perfil.gym_id !== gym.id || !perfil.invitacion_pendiente) return { ok: false, error: "Esa invitación ya fue aceptada." }
    const { error } = await admin.auth.resetPasswordForEmail(perfil.email, { redirectTo: `${await origen()}/bienvenida` })
    if (error) return { ok: false, error: "No pudimos reenviar la invitación." }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  return { ok: true }
}

export async function cambiarRol(usuarioId: string, rol: Rol): Promise<ResultadoAccion> {
  try {
    const { usuario } = await exigir("usuarios.gestionar")
    if (usuarioId === usuario.id) return { ok: false, error: "No podés cambiar tu propio rol." }
    const sb = await supabaseServer()
    const { error } = await sb.from("perfiles").update({ rol }).eq("id", usuarioId)
    if (error) return { ok: false, error: traducir(error) }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

export async function cambiarEstadoUsuario(usuarioId: string, activo: boolean): Promise<ResultadoAccion> {
  try {
    const { usuario } = await exigir("usuarios.gestionar")
    if (usuarioId === usuario.id) return { ok: false, error: "No podés desactivarte a vos mismo." }
    const sb = await supabaseServer()
    const { error } = await sb.from("perfiles").update({ activo }).eq("id", usuarioId)
    if (error) return { ok: false, error: traducir(error) }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

// ---------- Ingreso con QR ----------
export async function cambiarEstadoQR(activo: boolean): Promise<ResultadoAccion> {
  try {
    const { gym } = await exigir("configuracion.ver")
    const sb = await supabaseServer()
    const { error } = await sb.from("gyms").update({ qr_activo: activo }).eq("id", gym.id)
    if (error) return { ok: false, error: traducir(error) }
  } catch (e) {
    return { ok: false, error: traducir(e as Error) }
  }
  refrescar()
  return { ok: true }
}

export async function regenerarQR(): Promise<ResultadoAccion> {
  const sb = await supabaseServer()
  const { error } = await sb.rpc("qr_regenerar")
  if (error) return { ok: false, error: traducir(error) }
  refrescar()
  return { ok: true }
}
