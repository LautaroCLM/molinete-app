import type { Rol } from "@/types/domain"

/**
 * Permisos por rol. Única fuente de verdad: la usa la UI para mostrar u ocultar,
 * y en la Etapa 2 también las acciones del servidor (y se reflejan en las políticas RLS).
 */
export const PERMISOS = {
  "dashboard.totales": ["dueno"],
  "reportes.ver": ["dueno"],
  "caja.ver_todas": ["dueno"],
  "caja.anular_movimiento": ["dueno"],
  "configuracion.ver": ["dueno"],
  "usuarios.gestionar": ["dueno"],
  "auditoria.ver": ["dueno"],
  "socios.eliminar": ["dueno"],
  "productos.editar": ["dueno"],
  "productos.ver_costos": ["dueno"],
} as const satisfies Record<string, readonly Rol[]>

export type Permiso = keyof typeof PERMISOS

export function puede(rol: Rol, permiso: Permiso) {
  return (PERMISOS[permiso] as readonly Rol[]).includes(rol)
}
