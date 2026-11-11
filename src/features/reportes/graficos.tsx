"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { pesos, pesosCorto } from "@/lib/format"
import { cn } from "@/lib/utils"

const config = {
  ingresos: { label: "Ingresos", color: "var(--chart-1)" },
} satisfies ChartConfig

export function GraficoIngresosPeriodo({ datos }: { datos: { fecha: string; ingresos: number; egresos: number }[] }) {
  const fmt = (f: string) => {
    const [, m, d] = f.split("-")
    return `${Number(d)}/${Number(m)}`
  }
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <AreaChart data={datos} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="relleno-ingresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-ingresos)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-ingresos)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={fmt} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={pesosCorto} domain={[0, (max: number) => Math.max(max, 10000)]} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              labelFormatter={(f) => fmt(String(f))}
              formatter={(v) => (
                <span className="flex w-full justify-between gap-6">
                  <span className="text-muted-foreground">Ingresos</span>
                  <span className="font-semibold tabular-nums">{pesos(Number(v))}</span>
                </span>
              )}
            />
          }
        />
        <Area dataKey="ingresos" type="monotone" stroke="var(--color-ingresos)" strokeWidth={2} fill="url(#relleno-ingresos)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ChartContainer>
  )
}

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

/** Mapa de calor día × hora: una sola tonalidad, de claro a oscuro. */
export function MapaCalor({ datos }: { datos: { dia: number; hora: number; promedio: number }[] }) {
  const max = Math.max(...datos.map((d) => d.promedio), 1)
  const horas = Array.from(new Set(datos.map((d) => d.hora)))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-separate border-spacing-[3px] text-xs">
        <thead>
          <tr>
            <th className="w-20" />
            {horas.map((h) => (
              <th key={h} className="pb-1 text-center font-normal text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6].map((dia) => (
            <tr key={dia}>
              <th scope="row" className="pr-2 text-left font-normal text-muted-foreground">
                {DIAS[dia]}
              </th>
              {horas.map((h) => {
                const v = datos.find((d) => d.dia === dia && d.hora === h)?.promedio ?? 0
                const t = v / max
                return (
                  <td
                    key={h}
                    title={`${DIAS[dia]} de ${h} a ${h + 1} h: ${v.toLocaleString("es-AR")} personas en promedio`}
                    className={cn("h-8 rounded-[4px] text-center tabular-nums", t > 0.55 ? "text-white" : "text-transparent hover:text-foreground")}
                    style={{
                      background: v === 0 ? "var(--muted)" : `color-mix(in oklch, var(--chart-1) ${Math.round(12 + t * 88)}%, var(--card))`,
                    }}
                  >
                    {v >= 1 ? Math.round(v) : ""}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Menos gente</span>
        <span className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklch, var(--chart-1) 12%, var(--card)), var(--chart-1))" }} />
        <span>Más gente</span>
        <span className="ml-3">Promedio de personas por hora en el período.</span>
      </div>
    </div>
  )
}
