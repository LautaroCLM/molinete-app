"use client"

import { Bar, BarChart, CartesianGrid, Line, ComposedChart, XAxis, YAxis, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { pesos, pesosCorto } from "@/lib/format"

const configIngresos = {
  ingresos: { label: "Ingresos", color: "var(--chart-1)" },
} satisfies ChartConfig

export function GraficoIngresosMes({ datos }: { datos: { dia: number; fecha: string; ingresos: number; domingo: boolean }[] }) {
  const hoy = datos[datos.length - 1]?.dia
  return (
    <ChartContainer config={configIngresos} className="aspect-auto h-64 w-full">
      <BarChart data={datos} margin={{ left: 4, right: 4, top: 8 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={12} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={pesosCorto} domain={[0, (max: number) => Math.max(max, 10000)]} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => {
                const d = p?.[0]?.payload as { fecha: string; domingo: boolean } | undefined
                if (!d) return ""
                const [y, m, dd] = d.fecha.split("-")
                return `${dd}/${m}/${y}${d.domingo ? " · cerrado" : ""}`
              }}
              formatter={(v) => (
                <span className="flex w-full justify-between gap-6">
                  <span className="text-muted-foreground">Ingresos</span>
                  <span className="font-semibold tabular-nums">{pesos(Number(v))}</span>
                </span>
              )}
            />
          }
        />
        <Bar dataKey="ingresos" radius={[4, 4, 0, 0]} maxBarSize={22}>
          {datos.map((d) => (
            <Cell key={d.dia} fill="var(--color-ingresos)" fillOpacity={d.dia === hoy ? 1 : 0.55} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

const configHoras = {
  hoy: { label: "Hoy", color: "var(--chart-1)" },
  promedio: { label: "Promedio del mismo día", color: "var(--chart-5)" },
} satisfies ChartConfig

export function GraficoAsistenciasHora({ datos }: { datos: { hora: string; hoy: number | null; promedio: number }[] }) {
  return (
    <div>
      <ChartContainer config={configHoras} className="aspect-auto h-56 w-full">
        <ComposedChart data={datos} margin={{ left: 0, right: 4, top: 8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="hora" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(h) => `${h}h`} interval={2} />
          <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={<ChartTooltipContent labelFormatter={(h) => `De ${h} a ${Number(h) + 1} h`} />}
          />
          <Bar dataKey="hoy" fill="var(--color-hoy)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Line
            dataKey="promedio"
            type="monotone"
            stroke="var(--color-promedio)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[var(--chart-1)]" /> Hoy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-[var(--chart-5)]" /> Promedio de las últimas 4 semanas
        </span>
      </div>
    </div>
  )
}
