import { Logo, LogoDisco } from "@/components/layout/logo"

/** Marco de las pantallas de ingreso: panel de marca a la izquierda y formulario a la derecha. */
export function AuthLayout({ titulo, bajada, children }: { titulo: string; bajada: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col [--logo-hole:var(--sidebar)]">
        <Logo />
        <div className="mt-auto max-w-md">
          <p className="font-display text-5xl leading-[1.05] font-semibold tracking-tight">Cada socio que entra, cada peso que se cobra.</p>
          <p className="mt-4 text-lg text-sidebar-foreground">Cuotas, asistencias, caja y stock de tu gimnasio en un solo lugar.</p>
        </div>
        <LogoDisco className="pointer-events-none absolute -top-24 -right-24 size-[26rem] text-white/[0.04] [--logo-ring:rgba(255,255,255,0.06)]" />
        <LogoDisco className="pointer-events-none absolute right-40 bottom-48 size-40 text-white/[0.05] [--logo-ring:rgba(52,200,138,0.35)]" />
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="enter w-full max-w-sm">
          <div className="mb-10 lg:hidden [--logo-hole:var(--background)]">
            <Logo />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-2 text-muted-foreground">{bajada}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
