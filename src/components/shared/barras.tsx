import { pesos } from "@/lib/format"

/** Barras horizontales simples con valor y porcentaje. Una sola serie, un solo color. */
export function Barras({ filas, total }: { filas: { label: string; valor: number }[]; total: number }) {
  const max = Math.max(...filas.map((f) => f.valor), 1)
  return (
    <ul className="flex flex-col gap-3">
      {[...filas]
        .sort((a, b) => b.valor - a.valor)
        .map((f) => (
          <li key={f.label} className="grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground">{f.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${(f.valor / max) * 100}%` }} />
            </span>
            <span className="w-36 text-right font-semibold tabular-nums">
              {pesos(f.valor)}
              <span className="ml-1.5 inline-block w-8 text-xs font-normal text-muted-foreground">
                {total ? Math.round((f.valor / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
    </ul>
  )
}
