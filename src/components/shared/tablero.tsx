import { cn } from "@/lib/utils"

/**
 * "Tablero": una tira de indicadores unidos en un solo bloque, separados por
 * divisores, como el marcador de un gimnasio. Evita la grilla de tarjetas sueltas.
 */
export function Tablero({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "surface stagger grid grid-cols-2 overflow-hidden rounded-xl border bg-card",
        "[&>*]:border-b [&>*]:border-r [&>*]:-mb-px [&>*]:-mr-px",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Indicador({
  etiqueta,
  valor,
  detalle,
  tono,
  destacado,
  className,
}: {
  etiqueta: string
  valor: React.ReactNode
  detalle?: React.ReactNode
  tono?: "ok" | "warn" | "bad"
  destacado?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 px-5 py-4",
        destacado && "bg-brand glow-brand col-span-2 justify-between py-5 text-primary-foreground sm:col-span-1 sm:row-span-2",
        className,
      )}
    >
      <span className={cn("text-sm font-medium", destacado ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {etiqueta}
      </span>
      <span
        className={cn(
          "num-display truncate text-[1.9rem]",
          destacado && "text-[2.75rem] sm:mt-auto",
          tono === "ok" && "text-ok",
          tono === "warn" && "text-warn",
          tono === "bad" && "text-bad",
        )}
      >
        {valor}
      </span>
      {detalle && (
        <span className={cn("truncate text-xs", destacado ? "text-primary-foreground/75" : "text-muted-foreground")}>{detalle}</span>
      )}
    </div>
  )
}
