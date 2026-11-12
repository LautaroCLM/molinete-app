/**
 * Modelos del dominio. Reflejan las tablas que se crearán en Supabase (Etapa 2).
 * Todo registro de negocio lleva `gym_id` (multi-tenant).
 * Fechas como string ISO, igual que llegan desde la base.
 */

export type ID = string

export type Rol = "dueno" | "recepcionista"

export type ReglaVencimiento =
  | { tipo: "dias_desde_pago"; dias: number }
  | { tipo: "dia_fijo"; dia: number }

export interface GymConfig {
  vencimiento: ReglaVencimiento
  diasGracia: number
  /** Días sin asistencias para considerar que un socio "dejó de venir". */
  diasInactividad: number
}

export interface Gym {
  id: ID
  nombre: string
  direccion: string
  localidad: string
  telefono: string
  email: string
  logoUrl: string | null
  config: GymConfig
}

export interface Usuario {
  id: ID
  gym_id: ID
  nombre: string
  apellido: string
  email: string
  rol: Rol
  activo: boolean
  invitacionPendiente: boolean
  ultimoAcceso: string | null
}

export type TipoPlan = "mensual" | "por_clase" | "semanal" | "paquete" | "pase_diario"

export interface Plan {
  id: ID
  gym_id: ID
  nombre: string
  tipo: TipoPlan
  precio: number
  /** Para planes con vencimiento (mensual, semanal, pase diario). */
  duracionDias: number | null
  /** Para paquetes de X clases. */
  cantidadClases: number | null
  activo: boolean
}

export interface Socio {
  id: ID
  gym_id: ID
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string
  fechaAlta: string
  observaciones: string
  planId: ID
  /** Null para quienes pagan por clase. */
  vencimiento: string | null
  clasesRestantes: number | null
  activo: boolean
  ultimaAsistencia: string | null
}

export type EstadoCuota = "al_dia" | "por_vencer" | "en_gracia" | "vencido" | "por_clase" | "inactivo"

export type MedioPago = "efectivo" | "transferencia" | "mercado_pago" | "tarjeta"

export type CategoriaMovimiento =
  | "cuota"
  | "clase"
  | "venta_producto"
  | "otros_ingresos"
  | "gastos_varios"
  | "sueldos"
  | "servicios"
  | "alquiler"
  | "compra_mercaderia"
  | "mantenimiento"

export interface Pago {
  id: ID
  gym_id: ID
  socioId: ID
  planId: ID
  monto: number
  medio: MedioPago
  fecha: string
  usuarioId: ID
  movimientoId: ID
  /** Vencimiento resultante del pago (solo planes con vencimiento). */
  vencimientoHasta: string | null
}

export interface Asistencia {
  id: ID
  gym_id: ID
  socioId: ID
  fecha: string
  origen: "recepcion" | "qr"
  usuarioId: ID | null
}

export interface Movimiento {
  id: ID
  gym_id: ID
  /** Null para movimientos de administración (alquiler, sueldos, servicios) que carga el dueño fuera de una caja de turno. */
  cajaId: ID | null
  tipo: "ingreso" | "egreso"
  monto: number
  medio: MedioPago
  categoria: CategoriaMovimiento
  descripcion: string
  fecha: string
  usuarioId: ID
  anulacion: { fecha: string; usuarioId: ID; motivo: string } | null
}

export interface Caja {
  id: ID
  gym_id: ID
  usuarioId: ID
  apertura: string
  cierre: string | null
  montoInicial: number
  /** Efectivo contado al cerrar. */
  montoContado: number | null
  observaciones: string
}

export type CategoriaProducto = "bebidas" | "suplementos" | "snacks" | "merchandising" | "accesorios"

export interface Producto {
  id: ID
  gym_id: ID
  nombre: string
  categoria: CategoriaProducto
  costo: number
  precio: number
  stock: number
  stockMinimo: number
  activo: boolean
}

export interface MovimientoStock {
  id: ID
  gym_id: ID
  productoId: ID
  tipo: "entrada" | "venta" | "ajuste" | "anulacion"
  /** Positivo suma stock, negativo resta. */
  cantidad: number
  fecha: string
  usuarioId: ID
  nota: string
}

export interface RegistroAuditoria {
  id: ID
  gym_id: ID
  usuarioId: ID
  accion: string
  detalle: string
  fecha: string
}

export interface Sesion {
  usuario: Usuario
  gym: Gym
}

// ---------- Rutinas ----------
export interface EjercicioRutina {
  nombre: string
  series: string
  repeticiones: string
  descanso: string
  nota: string
}

export interface DiaRutina {
  nombre: string
  ejercicios: EjercicioRutina[]
}

export interface Rutina {
  id: ID
  nombre: string
  descripcion: string
  activo: boolean
  dias: DiaRutina[]
}
