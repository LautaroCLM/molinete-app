import { cn } from "@/lib/utils"
import { ESTADOS_CUOTA } from "@/lib/labels"
import type { EstadoCuota } from "@/types/domain"

/**
 * Colores de estado tomados de los discos olímpicos:
 * verde al día, amarillo por vencer, rojo vencido, violeta paga por clase.
 */
export const ESTILO_ESTADO: Record<EstadoCuota, { texto: string; fondo: string; disco: string }> = {
  al_dia: { texto: "text-ok", fondo: "bg-ok-soft", disco: "border-ok" },
  por_vencer: { texto: "text-warn", fondo: "bg-warn-soft", disco: "border-warn" },
  en_gracia: { texto: "text-bad", fondo: "bg-bad-soft", disco: "border-bad" },
  vencido: { texto: "text-bad", fondo: "bg-bad-soft", disco: "border-bad" },
  por_clase: { texto: "text-clase", fondo: "bg-clase-soft", disco: "border-clase" },
  inactivo: { texto: "text-off", fondo: "bg-off-soft", disco: "border-off" },
}

/** Un disco de pesas: círculo con agujero central. */
export function Disco({ estado, className }: { estado: EstadoCuota; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full border-[3px]", ESTILO_ESTADO[estado].disco, className)}
    />
  )
}

export function EstadoBadge({
  estado,
  className,
  children,
}: {
  estado: EstadoCuota
  className?: string
  children?: React.ReactNode
}) {
  const e = ESTILO_ESTADO[estado]
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-xs font-semibold whitespace-nowrap",
        e.fondo,
        e.texto,
        className,
      )}
    >
      <Disco estado={estado} />
      {children ?? ESTADOS_CUOTA[estado]}
    </span>
  )
}
