"use client"

import { useState } from "react"
import { fecha } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface PuntoProgreso {
  fecha: string
  peso: number | null
  e1rm: number | null
}

type Metrica = "e1rm" | "peso"
const NOMBRES: Record<Metrica, string> = { e1rm: "Fuerza estimada", peso: "Peso máximo" }

const W = 320
const H = 140
const PAD = { l: 8, r: 8, t: 14, b: 8 }

/** Gráfico de línea liviano (SVG propio) del progreso de un ejercicio: sirve en el celular sin cargar librerías. */
export function GraficoProgreso({ nombre, puntos }: { nombre: string; puntos: PuntoProgreso[] }) {
  const [metrica, setMetrica] = useState<Metrica>("e1rm")
  const datos = puntos.filter((p) => p[metrica] !== null).map((p) => ({ fecha: p.fecha, v: Math.round(Number(p[metrica]) * 10) / 10 }))

  if (datos.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">Todavía no hay pesos registrados para {nombre}.</p>
  }
  const valores = datos.map((d) => d.v)
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const margen = (max - min || max || 1) * 0.15
  const lo = min - margen
  const hi = max + margen
  const x = (i: number) => PAD.l + (datos.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (datos.length - 1))
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const linea = datos.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(" ")
  const area = `${linea} L${x(datos.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`
  const primero = datos[0]
  const ultimo = datos[datos.length - 1]
  const dif = Math.round((ultimo.v - primero.v) * 10) / 10

  return (
    <div className="mt-3">
      <div className="flex gap-2" role="tablist" aria-label="Qué mostrar">
        {(Object.keys(NOMBRES) as Metrica[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={metrica === m}
            onClick={() => setMetrica(m)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", metrica === m ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {NOMBRES[m]}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${nombre}: ${NOMBRES[metrica].toLowerCase()} de ${primero.v} kg a ${ultimo.v} kg en ${datos.length} sesiones`}>
        <defs>
          <linearGradient id="relleno-progreso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {datos.length > 1 && <path d={area} fill="url(#relleno-progreso)" />}
        {datos.length > 1 && <path d={linea} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {datos.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.v)} r={i === datos.length - 1 ? 5 : 3} fill={i === datos.length - 1 ? "var(--primary)" : "var(--card)"} stroke="var(--primary)" strokeWidth="2" />
        ))}
      </svg>

      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>{fecha(primero.fecha)}</span>
        {datos.length > 1 && <span>{fecha(ultimo.fecha)}</span>}
      </div>

      {datos.length > 1 ? (
        <p className="mt-2 text-sm">
          De <strong className="tabular-nums">{primero.v} kg</strong> a <strong className="tabular-nums">{ultimo.v} kg</strong>{" "}
          <span className={cn("font-semibold tabular-nums", dif >= 0 ? "text-ok" : "text-bad")}>
            ({dif >= 0 ? "+" : ""}
            {dif} kg)
          </span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {ultimo.v} kg. Con tu próxima sesión vas a ver la evolución.
        </p>
      )}
      {metrica === "e1rm" && <p className="mt-1 text-xs text-muted-foreground">Estimación del máximo que podrías levantar una vez, a partir de tu peso y repeticiones.</p>}
    </div>
  )
}
