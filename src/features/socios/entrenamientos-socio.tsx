"use client"

import { useState } from "react"
import { Dumbbell, Trophy } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Panel } from "@/components/shared/page-header"
import { fecha, num } from "@/lib/format"
import type { DatosEntrenamientos } from "@/lib/data"

const config = { e1rm: { label: "1RM estimado", color: "var(--chart-1)" } } satisfies ChartConfig

/** Entrenamientos que el socio registró desde su perfil: resumen, últimos y evolución por ejercicio. */
export function EntrenamientosSocio({ datos }: { datos: DatosEntrenamientos }) {
  const [elegido, setElegido] = useState(datos.progreso[0]?.nombre ?? "")
  const ejercicio = datos.progreso.find((e) => e.nombre === elegido) ?? datos.progreso[0]
  const puntos = (ejercicio?.puntos ?? []).filter((p) => p.e1rm !== null).map((p) => ({ fecha: p.fecha.slice(0, 10), e1rm: Math.round(Number(p.e1rm) * 10) / 10, peso: p.peso }))
  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]
  const fmt = (f: string) => {
    const [, m, d] = f.split("-")
    return `${Number(d)}/${Number(m)}`
  }

  return (
    <Panel titulo="Entrenamientos" descripcion="Lo que registró desde su perfil: peso y repeticiones por serie.">
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Resumen valor={num(datos.resumen.sesiones30)} etiqueta="en 30 días" />
        <Resumen valor={`${num(Math.round(datos.resumen.volumen30))} kg`} etiqueta="de volumen (30 d)" />
        <Resumen valor={num(datos.resumen.records)} etiqueta={datos.resumen.records === 1 ? "récord" : "récords"} icono />
      </dl>

      {puntos.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Evolución</p>
            {datos.progreso.length > 1 && (
              <Select value={ejercicio?.nombre} onValueChange={setElegido}>
                <SelectTrigger aria-label="Ejercicio" className="h-8 w-52 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {datos.progreso.map((e) => (
                    <SelectItem key={e.nombre} value={e.nombre}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {puntos.length < 2 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {ejercicio?.nombre}: una sola sesión registrada ({ultimo.peso ?? "—"} kg, 1RM estimado {ultimo.e1rm} kg). El gráfico aparece desde la segunda.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {ejercicio?.nombre}: 1RM estimado de {primero.e1rm} kg ({fmt(primero.fecha)}) a {ultimo.e1rm} kg ({fmt(ultimo.fecha)}).{" "}
                <strong className={ultimo.e1rm >= primero.e1rm ? "text-ok" : "text-bad"}>
                  {ultimo.e1rm >= primero.e1rm ? "+" : ""}
                  {Math.round((ultimo.e1rm - primero.e1rm) * 10) / 10} kg
                </strong>
              </p>
              <ChartContainer config={config} className="mt-2 aspect-auto h-52 w-full">
                <LineChart data={puntos} margin={{ left: 4, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={fmt} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={40} domain={["dataMin - 5", "dataMax + 5"]} tickFormatter={(v) => String(Math.round(Number(v)))} />
                  <ChartTooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(f) => fmt(String(f))}
                        formatter={(v) => (
                          <span className="flex w-full justify-between gap-6">
                            <span className="text-muted-foreground">1RM estimado</span>
                            <span className="font-semibold tabular-nums">{String(v)} kg</span>
                          </span>
                        )}
                      />
                    }
                  />
                  <Line dataKey="e1rm" type="monotone" stroke="var(--color-e1rm)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ChartContainer>
            </>
          )}
        </div>
      )}

      <div className="mt-5">
        <p className="text-sm font-semibold">Últimos entrenamientos</p>
        <ul className="mt-1 divide-y">
          {datos.sesiones.slice(0, 6).map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
              <Dumbbell className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.dia || "Entrenamiento"}</span>
                <span className="text-xs text-muted-foreground">{s.rutina}</span>
              </span>
              <span className="text-right text-xs text-muted-foreground tabular-nums">
                {fecha(s.fecha)}
                <br />
                {s.series} {s.series === 1 ? "serie" : "series"}
                {s.volumen > 0 && ` · ${num(s.volumen)} kg`}
              </span>
              {s.records > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn">
                  <Trophy className="size-3" /> {s.records}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

function Resumen({ valor, etiqueta, icono }: { valor: string; etiqueta: string; icono?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dd className="num-display flex items-center gap-1.5 text-2xl">
        {icono && <Trophy className="size-4 text-warn" />}
        {valor}
      </dd>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
    </div>
  )
}
