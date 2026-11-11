"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, Tags, UsersRound, History, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/configuracion", label: "Gimnasio", icono: Building2 },
  { href: "/configuracion/planes", label: "Planes y cuotas", icono: Tags },
  { href: "/configuracion/usuarios", label: "Usuarios y roles", icono: UsersRound },
  { href: "/configuracion/qr", label: "Ingreso con QR", icono: QrCode },
  { href: "/configuracion/actividad", label: "Registro de actividad", icono: History },
]

export function ConfigNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Secciones de configuración" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((i) => {
        const activo = pathname === i.href
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
              activo ? "bg-card text-foreground ring-1 ring-border" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <i.icono className="size-4" />
            {i.label}
          </Link>
        )
      })}
    </nav>
  )
}
