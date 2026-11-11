/**
 * Carga el gimnasio de demostración "Fuerza Sur" en la base (solo para desarrollo).
 *
 *   npm run seed
 *
 * Usa la clave secreta de .env.local. Es idempotente: borra el gimnasio de demo
 * y sus usuarios antes de volver a crearlos.
 *
 * Usuarios de prueba (contraseña para todos: Molinete2026):
 *   martin@fuerzasur.com.ar  Dueño
 *   sofia@fuerzasur.com.ar   Recepción (con caja abierta)
 *   lucas@fuerzasur.com.ar   Recepción (dejó la caja de ayer sin cerrar)
 */
import { config } from "dotenv"
import { randomUUID } from "node:crypto"
import { format } from "date-fns"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../src/types/database"
import * as mock from "../src/mocks/seed"

config({ path: ".env.local" })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SECRETA = process.env.SUPABASE_SECRET_KEY
if (!URL || !SECRETA) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local")
if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error("El seed solo corre contra Supabase local.")

const sb = createClient<Database>(URL, SECRETA, { auth: { persistSession: false, autoRefreshToken: false } })

const GYM_ID = "00000000-0000-4000-8000-000000000001"
const CONTRASENA = "Molinete2026"
const EMAILS: Record<string, string> = {
  usr_martin: "martin@fuerzasur.com.ar",
  usr_sofia: "sofia@fuerzasur.com.ar",
  usr_lucas: "lucas@fuerzasur.com.ar",
  usr_carla: "carla@fuerzasur.com.ar",
  usr_nahuel: "nahuel@fuerzasur.com.ar",
}

const ids = new Map<string, string>()
const uuid = (mockId: string) => {
  if (!ids.has(mockId)) ids.set(mockId, randomUUID())
  return ids.get(mockId)!
}
const dia = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd") : null)

async function insertar<T extends keyof Database["public"]["Tables"]>(tabla: T, filas: Database["public"]["Tables"][T]["Insert"][]) {
  for (let i = 0; i < filas.length; i += 500) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.from(tabla).insert(filas.slice(i, i + 500) as any)
    if (error) throw new Error(`${tabla}: ${error.message}`)
  }
  console.log(`  ${tabla}: ${filas.length}`)
}

async function main() {
  console.log("Limpiando datos de demo anteriores…")
  await sb.from("gyms").delete().eq("id", GYM_ID)
  const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 })
  for (const u of lista?.users ?? []) {
    if (u.email && Object.values(EMAILS).includes(u.email)) await sb.auth.admin.deleteUser(u.id)
  }

  console.log("Creando usuarios…")
  for (const u of mock.usuarios) {
    const { data, error } = await sb.auth.admin.createUser({
      email: EMAILS[u.id],
      password: u.invitacionPendiente ? undefined : CONTRASENA,
      email_confirm: !u.invitacionPendiente,
      user_metadata: { nombre: u.nombre },
    })
    if (error) throw new Error(`usuario ${EMAILS[u.id]}: ${error.message}`)
    ids.set(u.id, data.user.id)
  }

  console.log("Cargando el gimnasio Fuerza Sur…")
  const g = mock.gym
  const { error: eg } = await sb.from("gyms").insert({
    id: GYM_ID,
    nombre: g.nombre,
    direccion: g.direccion,
    localidad: g.localidad,
    telefono: g.telefono,
    email: g.email,
    venc_tipo: g.config.vencimiento.tipo,
    venc_dias: g.config.vencimiento.tipo === "dias_desde_pago" ? g.config.vencimiento.dias : 30,
    dias_gracia: g.config.diasGracia,
    dias_inactividad: g.config.diasInactividad,
  })
  if (eg) throw eg

  await insertar(
    "perfiles",
    mock.usuarios.map((u) => ({
      id: uuid(u.id),
      gym_id: GYM_ID,
      nombre: u.nombre,
      apellido: u.apellido,
      email: EMAILS[u.id],
      rol: u.rol,
      activo: u.activo,
      invitacion_pendiente: u.invitacionPendiente,
      ultimo_acceso: u.ultimoAcceso,
    })),
  )
  await insertar(
    "planes",
    mock.planes.map((p) => ({
      id: uuid(p.id),
      gym_id: GYM_ID,
      nombre: p.nombre,
      tipo: p.tipo,
      precio: p.precio,
      duracion_dias: p.duracionDias,
      cantidad_clases: p.cantidadClases,
      activo: p.activo,
    })),
  )
  await insertar(
    "socios",
    mock.socios.map((s) => ({
      id: uuid(s.id),
      gym_id: GYM_ID,
      nombre: s.nombre,
      apellido: s.apellido,
      dni: s.dni,
      telefono: s.telefono,
      email: s.email,
      fecha_alta: dia(s.fechaAlta)!,
      observaciones: s.observaciones,
      plan_id: uuid(s.planId),
      vencimiento: dia(s.vencimiento),
      clases_restantes: s.clasesRestantes,
      activo: s.activo,
      ultima_asistencia: s.ultimaAsistencia,
    })),
  )
  await insertar(
    "cajas",
    mock.cajas.map((c) => ({
      id: uuid(c.id),
      gym_id: GYM_ID,
      usuario_id: uuid(c.usuarioId),
      apertura: c.apertura,
      cierre: c.cierre,
      monto_inicial: c.montoInicial,
      monto_contado: c.montoContado,
      observaciones: c.observaciones,
    })),
  )
  await insertar(
    "movimientos",
    mock.movimientos.map((m) => ({
      id: uuid(m.id),
      gym_id: GYM_ID,
      caja_id: m.cajaId ? uuid(m.cajaId) : null,
      tipo: m.tipo,
      monto: m.monto,
      medio: m.medio,
      categoria: m.categoria,
      descripcion: m.descripcion,
      fecha: m.fecha,
      usuario_id: uuid(m.usuarioId),
      anulado_at: m.anulacion?.fecha ?? null,
      anulado_por: m.anulacion ? uuid(m.anulacion.usuarioId) : null,
      motivo_anulacion: m.anulacion?.motivo ?? null,
    })),
  )
  await insertar(
    "pagos",
    mock.pagos.map((p) => ({
      id: uuid(p.id),
      gym_id: GYM_ID,
      socio_id: uuid(p.socioId),
      plan_id: uuid(p.planId),
      monto: p.monto,
      medio: p.medio,
      fecha: p.fecha,
      usuario_id: uuid(p.usuarioId),
      movimiento_id: uuid(p.movimientoId),
      vencimiento_hasta: dia(p.vencimientoHasta),
    })),
  )
  await insertar(
    "asistencias",
    mock.asistencias.map((a) => ({
      id: uuid(a.id),
      gym_id: GYM_ID,
      socio_id: uuid(a.socioId),
      fecha: a.fecha,
      origen: a.origen,
      usuario_id: a.usuarioId ? uuid(a.usuarioId) : null,
    })),
  )
  await insertar(
    "productos",
    mock.productos.map((p) => ({
      id: uuid(p.id),
      gym_id: GYM_ID,
      nombre: p.nombre,
      categoria: p.categoria,
      costo: p.costo,
      precio: p.precio,
      stock: p.stock,
      stock_minimo: p.stockMinimo,
      activo: p.activo,
    })),
  )
  await insertar(
    "movimientos_stock",
    mock.movimientosStock.map((m) => ({
      id: uuid(m.id),
      gym_id: GYM_ID,
      producto_id: uuid(m.productoId),
      tipo: m.tipo,
      cantidad: m.cantidad,
      fecha: m.fecha,
      usuario_id: uuid(m.usuarioId),
      nota: m.nota,
    })),
  )
  await insertar(
    "auditoria",
    mock.auditoria.map((a) => ({
      id: uuid(a.id),
      gym_id: GYM_ID,
      usuario_id: uuid(a.usuarioId),
      accion: a.accion,
      detalle: a.detalle,
      fecha: a.fecha,
    })),
  )

  console.log(`\nListo. Ingresá en http://localhost:3000 con martin@fuerzasur.com.ar / ${CONTRASENA}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
