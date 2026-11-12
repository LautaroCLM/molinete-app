import { cn } from "@/lib/utils"

export function PageHeader({
  titulo,
  descripcion,
  acciones,
  className,
}: {
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  acciones?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-[2.25rem]">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-prose text-[0.95rem] text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

/** Panel de contenido con título. Sin sombra: borde fino y fondo de tarjeta. */
export function Panel({
  titulo,
  descripcion,
  accion,
  children,
  className,
  contenidoClassName,
}: {
  titulo?: React.ReactNode
  descripcion?: React.ReactNode
  accion?: React.ReactNode
  children: React.ReactNode
  className?: string
  contenidoClassName?: string
}) {
  return (
    <section className={cn("surface min-w-0 rounded-xl border bg-card text-card-foreground", className)}>
      {(titulo || accion) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {titulo && <h2 className="text-[0.95rem] font-semibold">{titulo}</h2>}
            {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
          </div>
          {accion}
        </header>
      )}
      <div className={cn("px-5 pb-5", !titulo && !accion && "pt-5", contenidoClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({
  icono,
  titulo,
  descripcion,
  accion,
}: {
  icono?: React.ReactNode
  titulo: string
  descripcion?: string
  accion?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icono && <div className="mb-1 text-muted-foreground [&_svg]:size-8">{icono}</div>}
      <p className="font-semibold">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  )
}
