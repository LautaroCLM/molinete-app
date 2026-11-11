import type { Database } from "@/types/database"
import type {
  Caja,
  CategoriaMovimiento,
  CategoriaProducto,
  Gym,
  MedioPago,
  Movimiento,
  MovimientoStock,
  Plan,
  Producto,
  Rol,
  Socio,
  TipoPlan,
  Usuario,
} from "@/types/domain"

type Fila<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]

/** Convierte filas de la base (snake_case) a los modelos que usan las pantallas. */
export const mapGym = (g: Fila<"gyms">): Gym => ({
  id: g.id,
  nombre: g.nombre,
  direccion: g.direccion,
  localidad: g.localidad,
  telefono: g.telefono,
  email: g.email,
  logoUrl: g.logo_url,
  config: {
    vencimiento:
      g.venc_tipo === "dia_fijo" ? { tipo: "dia_fijo", dia: g.venc_dia } : { tipo: "dias_desde_pago", dias: g.venc_dias },
    diasGracia: g.dias_gracia,
    diasInactividad: g.dias_inactividad,
  },
})

export const mapUsuario = (p: Fila<"perfiles">): Usuario => ({
  id: p.id,
  gym_id: p.gym_id,
  nombre: p.nombre,
  apellido: p.apellido,
  email: p.email,
  rol: p.rol as Rol,
  activo: p.activo,
  invitacionPendiente: p.invitacion_pendiente,
  ultimoAcceso: p.ultimo_acceso,
})

export const mapPlan = (p: Fila<"planes">): Plan => ({
  id: p.id,
  gym_id: p.gym_id,
  nombre: p.nombre,
  tipo: p.tipo as TipoPlan,
  precio: Number(p.precio),
  duracionDias: p.duracion_dias,
  cantidadClases: p.cantidad_clases,
  activo: p.activo,
})

export const mapSocio = (s: Fila<"socios">): Socio => ({
  id: s.id,
  gym_id: s.gym_id,
  nombre: s.nombre,
  apellido: s.apellido,
  dni: s.dni,
  telefono: s.telefono,
  email: s.email,
  fechaAlta: s.fecha_alta,
  observaciones: s.observaciones,
  planId: s.plan_id ?? "",
  vencimiento: s.vencimiento,
  clasesRestantes: s.clases_restantes,
  activo: s.activo,
  ultimaAsistencia: s.ultima_asistencia,
})

export const mapCaja = (c: Fila<"cajas">): Caja => ({
  id: c.id,
  gym_id: c.gym_id,
  usuarioId: c.usuario_id,
  apertura: c.apertura,
  cierre: c.cierre,
  montoInicial: Number(c.monto_inicial),
  montoContado: c.monto_contado === null ? null : Number(c.monto_contado),
  observaciones: c.observaciones,
})

export const mapMovimiento = (m: Fila<"movimientos">): Movimiento => ({
  id: m.id,
  gym_id: m.gym_id,
  cajaId: m.caja_id,
  tipo: m.tipo as Movimiento["tipo"],
  monto: Number(m.monto),
  medio: m.medio as MedioPago,
  categoria: m.categoria as CategoriaMovimiento,
  descripcion: m.descripcion,
  fecha: m.fecha,
  usuarioId: m.usuario_id,
  anulacion:
    m.anulado_at && m.anulado_por ? { fecha: m.anulado_at, usuarioId: m.anulado_por, motivo: m.motivo_anulacion ?? "" } : null,
})

export const mapProducto = (p: Fila<"productos">): Producto => ({
  id: p.id,
  gym_id: p.gym_id,
  nombre: p.nombre,
  categoria: p.categoria as CategoriaProducto,
  costo: Number(p.costo),
  precio: Number(p.precio),
  stock: p.stock,
  stockMinimo: p.stock_minimo,
  activo: p.activo,
})

export const mapMovimientoStock = (m: Fila<"movimientos_stock">): MovimientoStock => ({
  id: m.id,
  gym_id: m.gym_id,
  productoId: m.producto_id,
  tipo: m.tipo as MovimientoStock["tipo"],
  cantidad: m.cantidad,
  fecha: m.fecha,
  usuarioId: m.usuario_id,
  nota: m.nota,
})
