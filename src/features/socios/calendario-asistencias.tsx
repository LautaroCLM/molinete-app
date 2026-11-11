import { addDays, format, getDay, startOfDay, startOfWeek, subWeeks } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

/** Grilla de las últimas N semanas: cada casilla es un día, marcada si vino. */
export function CalendarioAsistencias({ fechas, semanas = 12 }: { fechas: string[]; semanas?: number }) {
  const hoy = startOfDay(new Date())
  const inicio = startOfWeek(subWeeks(hoy, semanas - 1), { weekStartsOn: 1 })
  const vino = new Set(fechas.map((f) => format(new Date(f), "yyyy-MM-dd")))
  const columnas = Array.from({ length: semanas }, (_, w) =>
    Array.from({ length: 6 }, (_, d) => addDays(inicio, w * 7 + d)),
  )

  return (
    <div className="flex gap-2">
      <div className="grid grid-rows-6 gap-1 pt-5 text-[0.65rem] text-muted-foreground">
        {DIAS.map((d) => (
          <span key={d} className="flex h-4 items-center">
            {d}
          </span>
        ))}
      </div>
      <div className="flex flex-1 justify-between gap-1 overflow-x-auto">
        {columnas.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="h-4 text-[0.65rem] text-muted-foreground">
              {i % 2 === 0 ? format(col[0], "d MMM", { locale: es }) : ""}
            </span>
            {col.map((dia) => {
              const k = format(dia, "yyyy-MM-dd")
              const futuro = dia > hoy
              const si = vino.has(k)
              return (
                <span
                  key={k}
                  title={`${format(dia, "EEEE d/MM", { locale: es })}${si ? ": vino" : ""}`}
                  className={cn(
                    "size-4 rounded-[4px]",
                    futuro ? "bg-transparent" : si ? "bg-primary" : "bg-muted",
                    getDay(dia) === 6 && !si && !futuro && "bg-muted/60",
                    k === format(hoy, "yyyy-MM-dd") && "ring-2 ring-foreground/30 ring-offset-1 ring-offset-card",
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
