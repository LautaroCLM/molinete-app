import type {
  CategoriaMovimiento,
  CategoriaProducto,
  EstadoCuota,
  MedioPago,
  Rol,
  TipoPlan,
} from "@/types/domain"

export const MEDIOS_PAGO: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercado_pago: "Mercado Pago",
  tarjeta: "Tarjeta",
}

export const CATEGORIAS_MOVIMIENTO: Record<CategoriaMovimiento, { label: string; tipo: "ingreso" | "egreso" }> = {
  cuota: { label: "Cuota", tipo: "ingreso" },
  clase: { label: "Clase suelta", tipo: "ingreso" },
  venta_producto: { label: "Venta de productos", tipo: "ingreso" },
  otros_ingresos: { label: "Otros ingresos", tipo: "ingreso" },
  gastos_varios: { label: "Gastos varios", tipo: "egreso" },
  sueldos: { label: "Sueldos", tipo: "egreso" },
  servicios: { label: "Servicios", tipo: "egreso" },
  alquiler: { label: "Alquiler", tipo: "egreso" },
  compra_mercaderia: { label: "Compra de mercadería", tipo: "egreso" },
  mantenimiento: { label: "Mantenimiento", tipo: "egreso" },
}

export const CATEGORIAS_PRODUCTO: Record<CategoriaProducto, string> = {
  bebidas: "Bebidas",
  suplementos: "Suplementos",
  snacks: "Snacks",
  merchandising: "Merchandising",
  accesorios: "Accesorios",
}

export const TIPOS_PLAN: Record<TipoPlan, { label: string; descripcion: string }> = {
  mensual: { label: "Mensual", descripcion: "Paga y queda al día hasta el vencimiento." },
  por_clase: { label: "Por clase", descripcion: "Paga cada clase suelta. No tiene vencimiento." },
  semanal: { label: "Semanal", descripcion: "Queda al día por la cantidad de días que elijas." },
  paquete: { label: "Paquete de clases", descripcion: "Compra una cantidad de clases para usar cuando quiera." },
  pase_diario: { label: "Pase diario", descripcion: "Vale solo por el día." },
}

export const ESTADOS_CUOTA: Record<EstadoCuota, string> = {
  al_dia: "Al día",
  por_vencer: "Por vencer",
  en_gracia: "En gracia",
  vencido: "Vencido",
  por_clase: "Por clase",
  inactivo: "Inactivo",
}

export const ROLES: Record<Rol, { label: string; descripcion: string }> = {
  dueno: {
    label: "Dueño",
    descripcion: "Ve y hace todo: reportes, totales de caja, configuración y usuarios.",
  },
  recepcionista: {
    label: "Recepción",
    descripcion: "Socios, cobros, asistencias, ventas y su propia caja. No ve reportes ni totales generales.",
  },
}
