/**
 * Validaciones compartidas entre formularios (cliente) y acciones del servidor.
 */
import { z } from "zod"

export type ResultadoAccion<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

const medio = z.enum(["efectivo", "transferencia", "mercado_pago", "tarjeta"], {
  error: "Elegí el medio de pago.",
})
const monto = z.coerce.number({ error: "Ingresá un monto." }).positive("El monto tiene que ser mayor a cero.")

export const socioSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre."),
  apellido: z.string().trim().min(2, "Ingresá el apellido."),
  dni: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().min(7, "El DNI tiene que tener 7 u 8 números.").max(8, "El DNI tiene que tener 7 u 8 números.")),
  telefono: z.string().trim().optional().default(""),
  email: z.union([z.literal(""), z.email("El email no parece válido.")]).default(""),
  fechaAlta: z.string().min(1, "Elegí la fecha de alta."),
  planId: z.string().min(1, "Elegí un plan."),
  observaciones: z.string().optional().default(""),
})
export type SocioInput = z.input<typeof socioSchema>

export const cobroSchema = z.object({
  socioId: z.string().min(1, "Elegí un socio."),
  planId: z.string().min(1, "Elegí qué cobrar."),
  monto,
  medio,
})
export type CobroInput = z.input<typeof cobroSchema>

export const ventaSchema = z.object({
  items: z
    .array(z.object({ productoId: z.string(), cantidad: z.number().int().positive() }))
    .min(1, "Agregá al menos un producto."),
  medio,
})

export const aperturaCajaSchema = z.object({
  montoInicial: z.coerce.number({ error: "Ingresá el efectivo inicial." }).min(0, "No puede ser negativo."),
  observaciones: z.string().optional(),
})

export const cierreCajaSchema = z.object({
  cajaId: z.string(),
  montoContado: z.coerce.number({ error: "Ingresá el efectivo contado." }).min(0, "No puede ser negativo."),
  observaciones: z.string().optional(),
})

export const movimientoSchema = z.object({
  tipo: z.enum(["ingreso", "egreso"]),
  categoria: z.string().min(1, "Elegí una categoría."),
  monto,
  medio,
  descripcion: z.string().trim().min(3, "Escribí una descripción corta."),
  sinCaja: z.boolean().optional().default(false),
})

export const anulacionSchema = z.object({
  movimientoId: z.string(),
  motivo: z.string().trim().min(5, "Contá brevemente por qué se anula."),
})

export const productoSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre."),
  categoria: z.string().min(1, "Elegí una categoría."),
  costo: z.coerce.number().min(0, "No puede ser negativo."),
  precio: z.coerce.number().positive("Ingresá el precio de venta."),
  stock: z.coerce.number().int("Usá números enteros.").min(0, "No puede ser negativo."),
  stockMinimo: z.coerce.number().int("Usá números enteros.").min(0, "No puede ser negativo."),
})

export const ajusteStockSchema = z.object({
  productoId: z.string(),
  tipo: z.enum(["entrada", "ajuste"]),
  cantidad: z.coerce.number().int("Usá números enteros.").refine((n) => n !== 0, "La cantidad no puede ser cero."),
  nota: z.string().trim().min(3, "Contá el motivo."),
})

export const planSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre del plan."),
  tipo: z.enum(["mensual", "por_clase", "semanal", "paquete", "pase_diario"]),
  precio: z.coerce.number().positive("Ingresá el precio."),
  duracionDias: z.coerce.number().int().positive().nullable().optional(),
  cantidadClases: z.coerce.number().int().positive().nullable().optional(),
})

export const gimnasioSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre del gimnasio."),
  direccion: z.string().trim().default(""),
  localidad: z.string().trim().default(""),
  telefono: z.string().trim().default(""),
  email: z.union([z.literal(""), z.email("El email no parece válido.")]).default(""),
})

export const reglasSchema = z
  .object({
    vencTipo: z.enum(["dias_desde_pago", "dia_fijo"]),
    vencDias: z.coerce.number().int().min(1, "Mínimo 1 día.").max(365, "Máximo 365 días."),
    vencDia: z.coerce.number().int().min(1).max(28, "Elegí un día entre 1 y 28."),
    diasGracia: z.coerce.number().int().min(0, "No puede ser negativo.").max(60, "Máximo 60 días."),
    diasInactividad: z.coerce.number().int().min(1, "Mínimo 1 día.").max(365, "Máximo 365 días."),
  })

const password = z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres.")

export const loginSchema = z.object({
  email: z.email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
})

export const contrasenaSchema = z.object({ password })

// ---------- Administración de la plataforma ----------
const credenciales = {
  nombre: z.string().trim().min(2, "Ingresá el nombre."),
  apellido: z.string().trim().default(""),
  email: z.email("Ingresá un email válido."),
  password,
}
export const usuarioAdminSchema = z.object({ ...credenciales, rol: z.enum(["dueno", "recepcionista"]).default("recepcionista") })

export const altaGimnasioSchema = z.object({
  gimnasio: z.object({
    nombre: z.string().trim().min(2, "Ingresá el nombre del gimnasio."),
    direccion: z.string().trim().default(""),
    localidad: z.string().trim().default(""),
    telefono: z.string().trim().default(""),
    email: z.union([z.literal(""), z.email("El email del gimnasio no parece válido.")]).default(""),
  }),
  dueno: z.object(credenciales),
  empleados: z.array(z.object(credenciales)).max(20, "Máximo 20 empleados por alta."),
})
