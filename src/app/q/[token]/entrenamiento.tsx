"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Check, Minus, Plus, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { aNumero, cantidadSeries, e1rm, reloj, repsSugeridas, segundosDescanso } from "@/lib/entrenamiento"
import { fecha, num } from "@/lib/format"
import type { DatosEntrenamiento, Historial, ResultadoGuardado, RutinaPerfil } from "@/lib/actions/qr"
import { cn } from "@/lib/utils"

interface SerieForm {
  peso: string
  reps: string
  hecha: boolean
}
interface EjercicioForm {
  nombre: string
  planSeries: string
  planReps: string
  planDescanso: string
  nota: string
  descanso: number
  series: SerieForm[]
}
interface Borrador {
  v: 1
  clienteId: string
  rutinaId: string
  diaNombre: string
  inicio: number
  ejercicios: EjercicioForm[]
}

const clave = (gymId: string, socioId: string) => `molinete:entreno:${gymId}:${socioId}`
const VIGENCIA_BORRADOR_MS = 8 * 3600 * 1000

function leerBorrador(gymId: string, socioId: string, rutinaId: string, diaNombre: string): Borrador | null {
  try {
    const crudo = localStorage.getItem(clave(gymId, socioId))
    if (!crudo) return null
    const b = JSON.parse(crudo) as Borrador
    if (b.v !== 1 || b.rutinaId !== rutinaId || b.diaNombre !== diaNombre || Date.now() - b.inicio > VIGENCIA_BORRADOR_MS) return null
    return b
  } catch {
    return null
  }
}
function guardarBorrador(gymId: string, socioId: string, b: Borrador | null) {
  try {
    if (b) localStorage.setItem(clave(gymId, socioId), JSON.stringify(b))
    else localStorage.removeItem(clave(gymId, socioId))
  } catch {
    // sin almacenamiento: el entrenamiento sigue, pero no se podrá retomar si se cierra la app
  }
}

/** Arma las series de cada ejercicio con lo que hizo la última vez (o lo sugerido por la rutina). */
function armarEjercicios(rutina: RutinaPerfil, diaIdx: number, historial: Historial): EjercicioForm[] {
  return (rutina.dias[diaIdx]?.ejercicios ?? []).map((e) => {
    const h = historial[e.nombre.trim().toLowerCase()]
    const cantidad = h?.series.length ? Math.max(h.series.length, 1) : cantidadSeries(e.series)
    const sugeridas = repsSugeridas(e.repeticiones)
    return {
      nombre: e.nombre,
      planSeries: e.series,
      planReps: e.repeticiones,
      planDescanso: e.descanso,
      nota: e.nota,
      descanso: segundosDescanso(e.descanso),
      series: Array.from({ length: cantidad }, (_, i) => {
        const base = h?.series[i] ?? h?.series[h.series.length - 1]
        return {
          peso: base?.peso != null ? String(base.peso) : "",
          reps: base?.reps != null ? String(base.reps) : sugeridas ? String(sugeridas) : "",
          hecha: false,
        }
      }),
    }
  })
}

/** Récord provisorio: la mejor serie hecha supera el mejor 1RM anterior de ese ejercicio. */
function esRecord(e: EjercicioForm, historial: Historial) {
  const previo = historial[e.nombre.trim().toLowerCase()]?.mejorE1rm ?? 0
  if (!previo) return false
  return e.series.some((s) => {
    const peso = aNumero(s.peso)
    const reps = aNumero(s.reps)
    return s.hecha && peso && peso > 0 && reps && e1rm(peso, reps) > previo
  })
}

export function EntrenamientoVista({
  gymId,
  socioId,
  rutina,
  diaIdx,
  historial,
  onGuardar,
  onSalir,
  onTerminado,
}: {
  gymId: string
  socioId: string
  rutina: RutinaPerfil
  diaIdx: number
  historial: Historial
  onGuardar: (datos: DatosEntrenamiento) => Promise<ResultadoGuardado>
  onSalir: () => void
  onTerminado: () => void
}) {
  const dia = rutina.dias[diaIdx]
  const [inicial] = useState(() => {
    const b = leerBorrador(gymId, socioId, rutina.id, dia.nombre)
    return b ?? { v: 1 as const, clienteId: crypto.randomUUID(), rutinaId: rutina.id, diaNombre: dia.nombre, inicio: Date.now(), ejercicios: armarEjercicios(rutina, diaIdx, historial) }
  })
  const [ejercicios, setEjercicios] = useState<EjercicioForm[]>(inicial.ejercicios)
  const [error, setError] = useState<string>()
  const [confirmaSalir, setConfirmaSalir] = useState(false)
  const [resumen, setResumen] = useState<Extract<ResultadoGuardado, { ok: true }> | null>(null)
  const [pendiente, start] = useTransition()

  // Reloj general y descanso entre series
  const [ahora, setAhora] = useState(() => Date.now())
  const [finDescanso, setFinDescanso] = useState<number | null>(null)
  const [avisoFin, setAvisoFin] = useState(false)
  const finRef = useRef<number | null>(null)
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setAhora(t)
      if (finRef.current !== null && t >= finRef.current) {
        finRef.current = null
        setFinDescanso(null)
        setAvisoFin(true)
        try {
          navigator.vibrate?.([200, 100, 200])
        } catch {
          // sin vibración en este dispositivo
        }
        setTimeout(() => setAvisoFin(false), 4000)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])
  const iniciarDescanso = (segundos: number) => {
    const fin = Date.now() + segundos * 1000
    finRef.current = fin
    setFinDescanso(fin)
    setAvisoFin(false)
  }
  const ajustarDescanso = (delta: number) => {
    if (finRef.current === null) return
    finRef.current = Math.max(Date.now() + 1000, finRef.current + delta * 1000)
    setFinDescanso(finRef.current)
  }
  const saltarDescanso = () => {
    finRef.current = null
    setFinDescanso(null)
  }

  // Borrador: si se cierra la app a mitad de camino, se puede retomar
  useEffect(() => {
    if (resumen) return
    guardarBorrador(gymId, socioId, { ...inicial, ejercicios })
  }, [ejercicios, gymId, socioId, inicial, resumen])

  const cambiarSerie = (ei: number, si: number, cambio: Partial<SerieForm>) =>
    setEjercicios((es) => es.map((e, i) => (i === ei ? { ...e, series: e.series.map((s, j) => (j === si ? { ...s, ...cambio } : s)) } : e)))

  function alternarHecha(ei: number, si: number) {
    const e = ejercicios[ei]
    const pasaAHecha = !e.series[si].hecha
    cambiarSerie(ei, si, { hecha: pasaAHecha })
    if (pasaAHecha) iniciarDescanso(e.descanso)
    else saltarDescanso()
  }

  function agregarSerie(ei: number) {
    setEjercicios((es) =>
      es.map((e, i) => {
        if (i !== ei || e.series.length >= 20) return e
        const ultima = e.series[e.series.length - 1]
        return { ...e, series: [...e.series, { peso: ultima?.peso ?? "", reps: ultima?.reps ?? "", hecha: false }] }
      }),
    )
  }
  function quitarSerie(ei: number) {
    setEjercicios((es) => es.map((e, i) => (i === ei && e.series.length > 1 ? { ...e, series: e.series.slice(0, -1) } : e)))
  }

  function terminar() {
    const hechos = ejercicios
      .map((e) => ({
        nombre: e.nombre,
        series: e.series
          .filter((s) => s.hecha && (aNumero(s.peso) !== null || aNumero(s.reps) !== null))
          .map((s) => ({ peso: aNumero(s.peso), reps: aNumero(s.reps) !== null ? Math.round(aNumero(s.reps)!) : null })),
      }))
      .filter((e) => e.series.length > 0)
    if (hechos.length === 0) return setError("Marcá con ✓ al menos una serie que hayas hecho.")
    setError(undefined)
    start(async () => {
      const r = await onGuardar({
        clienteId: inicial.clienteId,
        rutinaId: rutina.id,
        rutinaNombre: rutina.nombre,
        diaNombre: dia.nombre,
        iniciadoEn: new Date(inicial.inicio).toISOString(),
        ejercicios: hechos,
      })
      if (!r.ok) return setError(r.mensaje)
      guardarBorrador(gymId, socioId, null)
      saltarDescanso()
      setResumen(r)
    })
  }

  function salir() {
    guardarBorrador(gymId, socioId, null)
    onSalir()
  }

  if (resumen) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-ok-soft text-ok">
          <Check className="size-8" />
        </span>
        <div>
          <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight">¡Entrenamiento guardado!</h1>
          <p className="mt-2 text-muted-foreground">{dia.nombre}</p>
        </div>
        <dl className="grid w-full max-w-xs grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card px-4 py-3">
            <dd className="num-display text-3xl">{num(resumen.series)}</dd>
            <dt className="text-xs text-muted-foreground">series</dt>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <dd className="num-display text-3xl">{num(Math.round(resumen.volumen))}</dd>
            <dt className="text-xs text-muted-foreground">kg de volumen</dt>
          </div>
        </dl>
        {resumen.records.length > 0 && (
          <div className="w-full max-w-xs rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-left">
            <p className="flex items-center gap-2 font-semibold text-warn">
              <Trophy className="size-4" /> {resumen.records.length === 1 ? "¡Nuevo récord!" : "¡Nuevos récords!"}
            </p>
            <ul className="mt-1 text-sm">
              {resumen.records.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <Button size="lg" className="h-14 w-full max-w-xs text-lg" onClick={onTerminado}>
          Volver a mi perfil
        </Button>
      </div>
    )
  }

  const restante = finDescanso ? Math.max(0, Math.ceil((finDescanso - ahora) / 1000)) : 0
  const transcurrido = Math.max(0, Math.floor((ahora - inicial.inicio) / 1000))

  return (
    <div className="flex flex-1 flex-col gap-4 pb-40">
      <div className="flex items-center justify-between gap-3">
        {confirmaSalir ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">¿Descartar este entrenamiento?</span>
            <button onClick={salir} className="font-semibold text-bad underline underline-offset-4">
              Descartar
            </button>
            <button onClick={() => setConfirmaSalir(false)} className="font-semibold underline underline-offset-4">
              Seguir
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmaSalir(true)} className="text-sm text-muted-foreground underline underline-offset-4">
            Salir
          </button>
        )}
        <span className="num-display text-2xl tabular-nums text-muted-foreground" aria-label="Tiempo de entrenamiento">
          {reloj(transcurrido)}
        </span>
      </div>

      <div>
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">{dia.nombre}</h1>
        <p className="text-sm text-muted-foreground">{rutina.nombre}</p>
      </div>

      {ejercicios.map((e, ei) => {
        const h = historial[e.nombre.trim().toLowerCase()]
        const plan = [e.planSeries && `${e.planSeries} series`, e.planReps && `${e.planReps} reps`, e.planDescanso && `descanso ${e.planDescanso}`].filter(Boolean).join(" · ")
        return (
          <section key={ei} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">
                <span className="mr-2 text-muted-foreground tabular-nums">{ei + 1}.</span>
                {e.nombre}
              </h2>
              {esRecord(e, historial) && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn">
                  <Trophy className="size-3" /> Récord
                </span>
              )}
            </div>
            {plan && <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{plan}</p>}
            {e.nota && <p className="mt-1 text-sm">{e.nota}</p>}
            {h && h.series.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Última vez ({fecha(h.fecha)}): {h.series.map((s) => `${s.peso ?? "—"}×${s.reps ?? "—"}`).join(" · ")}
              </p>
            )}

            <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>#</span>
              <span className="text-center">Kg</span>
              <span className="text-center">Reps</span>
              <span />
            </div>
            <div className="mt-1 flex flex-col gap-2">
              {e.series.map((s, si) => (
                <div key={si} className={cn("grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-xl p-1 transition-colors", s.hecha && "bg-ok-soft")}>
                  <span className="text-center text-sm font-semibold tabular-nums text-muted-foreground">{si + 1}</span>
                  <Input
                    aria-label={`Peso de la serie ${si + 1} de ${e.nombre}`}
                    inputMode="decimal"
                    value={s.peso}
                    onChange={(ev) => cambiarSerie(ei, si, { peso: ev.target.value })}
                    placeholder="—"
                    className="h-12 text-center text-lg font-semibold tabular-nums"
                    autoComplete="off"
                  />
                  <Input
                    aria-label={`Repeticiones de la serie ${si + 1} de ${e.nombre}`}
                    inputMode="numeric"
                    value={s.reps}
                    onChange={(ev) => cambiarSerie(ei, si, { reps: ev.target.value })}
                    placeholder="—"
                    className="h-12 text-center text-lg font-semibold tabular-nums"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => alternarHecha(ei, si)}
                    aria-label={`${s.hecha ? "Desmarcar" : "Marcar como hecha"} la serie ${si + 1} de ${e.nombre}`}
                    aria-pressed={s.hecha}
                    className={cn(
                      "grid size-12 place-items-center rounded-xl border transition-[transform,background-color] duration-150 ease-(--ease-out) active:scale-95",
                      s.hecha ? "border-transparent bg-brand text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Check className="size-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => agregarSerie(ei)} disabled={e.series.length >= 20}>
                <Plus /> Serie
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => quitarSerie(ei)} disabled={e.series.length <= 1}>
                <Minus /> Quitar
              </Button>
            </div>
          </section>
        )
      })}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-5 pt-3 pb-4 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {(restante > 0 || avisoFin) && (
            <div role="status" aria-live="polite" className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-2.5">
              {restante > 0 ? (
                <>
                  <span>
                    <span className="text-xs text-muted-foreground">Descanso</span>
                    <span className="num-display ml-2 text-2xl tabular-nums">{reloj(restante)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => ajustarDescanso(-15)}>
                      −15 s
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => ajustarDescanso(15)}>
                      +15 s
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={saltarDescanso}>
                      Saltar
                    </Button>
                  </span>
                </>
              ) : (
                <span className="font-semibold text-ok">¡A entrenar! Terminó el descanso.</span>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-bad">
              {error}
            </p>
          )}
          <Button size="lg" className="h-14 text-lg" onClick={terminar} disabled={pendiente}>
            {pendiente ? "Guardando…" : "Terminar entrenamiento"}
          </Button>
        </div>
      </div>
    </div>
  )
}
