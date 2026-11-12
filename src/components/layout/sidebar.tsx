"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV } from "./nav"
import { Logo } from "./logo"
import { usePanel } from "./panel-context"
import { ROLES } from "@/lib/labels"

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { puede } = usePanel()

  return (
    <nav aria-label="Secciones" className="flex flex-col gap-0.5">
      {NAV.filter((i) => !i.permiso || puede(i.permiso)).map((item) => {
        const activo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        const Icono = item.icono
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[0.95rem] font-medium transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
              activo && "bg-gradient-to-r from-[color-mix(in_srgb,var(--brand-from)_22%,transparent)] to-transparent text-sidebar-accent-foreground",
            )}
          >
            {activo && <span aria-hidden className="bar-in absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-brand" />}
            <Icono className={cn("size-[1.15rem] shrink-0 opacity-70 group-hover:opacity-100", activo && "text-[var(--brand-from)] opacity-100")} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col bg-sidebar px-3 py-5 text-sidebar-foreground lg:flex [--logo-hole:var(--sidebar)]">
      <Link href="/" className="mb-7 px-3 text-white" aria-label="Molinete, ir al inicio">
        <Logo />
      </Link>
      <SidebarNav />
      <div className="mt-auto">
        <SidebarUsuario />
      </div>
    </aside>
  )
}

export function SidebarUsuario() {
  const { usuario, gym } = usePanel()
  return (
    <div className="rounded-lg border border-sidebar-border px-3 py-2.5 text-xs">
      <p className="truncate font-semibold text-white">{gym.nombre}</p>
      <p className="truncate text-sidebar-foreground/80">
        {usuario.nombre} {usuario.apellido} · {ROLES[usuario.rol].label}
      </p>
    </div>
  )
}
