import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Wallet,
  Package,
  ChartColumnBig,
  Settings,
  type LucideIcon,
} from "lucide-react"
import type { Permiso } from "@/lib/permissions"

export interface ItemNav {
  href: string
  label: string
  icono: LucideIcon
  permiso?: Permiso
}

export const NAV: ItemNav[] = [
  { href: "/", label: "Inicio", icono: LayoutDashboard },
  { href: "/clientes", label: "Socios", icono: Users },
  { href: "/asistencias", label: "Asistencias", icono: CalendarCheck2 },
  { href: "/caja", label: "Caja", icono: Wallet },
  { href: "/inventario", label: "Inventario", icono: Package },
  { href: "/reportes", label: "Reportes", icono: ChartColumnBig, permiso: "reportes.ver" },
  { href: "/configuracion", label: "Configuración", icono: Settings, permiso: "configuracion.ver" },
]
