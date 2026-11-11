import Link from "next/link"
import { Logo } from "@/components/layout/logo"
import { exigirSuperadmin } from "@/lib/data/admin"
import { SalirBoton } from "./salir-boton"

export const metadata = { title: "Administración" }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await exigirSuperadmin()
  return (
    <div className="min-h-svh">
      <header className="bg-sidebar text-white [--logo-hole:var(--sidebar)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" aria-label="Administración, ir al inicio" className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold sm:inline">Administración</span>
          </Link>
          <span className="ml-auto hidden truncate text-sm text-sidebar-foreground sm:inline">{admin.email}</span>
          <SalirBoton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
