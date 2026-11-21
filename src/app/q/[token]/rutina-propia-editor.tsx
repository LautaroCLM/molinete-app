"use client"

import { useState, useTransition } from "react"
import { ArrowDown, ArrowLeft, ArrowUp, LayoutGrid, Plus, Trash2 } from "lucide-react"
import { SelectorEjercicio, type EjercicioElegido } from "@/components/shared/selector-ejercicio"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { claveEjercicio, EJERCICIOS_BASE } from "@/lib/ejercicios-base"
import { rutinaSchema } from "@/lib/schemas"
import type { EjercicioBibliotecaSocio, ResultadoRutinaPropia, RutinaPerfil } from "@/lib/actions/qr"

interface EjercicioForm {
  key: string
  nombre: string
  series: string
  repeticiones: string
  descanso: string
  nota: string
  video: string
}
interface DiaForm {
  key: string
  nombre: string
  ejercicios: EjercicioForm[]
}

const uid = () => crypto.randomUUID()
const vacio = (): EjercicioForm => ({ key: uid(), nombre: "", series: "", repeticiones: "", descanso: "", nota: "", video: "" })
const LETRAS = "ABCDEFGHIJKLMN"

function mover<T>(lista: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= lista.length) return lista
  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}

/** Armado de una rutina propia desde el celular: nombre, días y ejercicios. Es privada: solo la ve el socio. */
export function RutinaPropiaEditor({
  rutina,
  biblioteca,
  onGuardar,
  onCancelar,
}: {
  rutina: RutinaPerfil | null
  biblioteca: EjercicioBibliotecaSocio[]
  onGuardar: (datos: { nombre: string; descripcion: string; dias: { nombre: string; ejercicios: Omit<EjercicioForm, "key">[] }[] }) => Promise<ResultadoRutinaPropia>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(rutina?.nombre ?? "")
  const [dias, setDias] = useState<DiaForm[]>(() =>
    rutina?.dias.length
      ? rutina.dias.map((d) => ({ key: uid(), nombre: d.nombre, ejercicios: d.ejercicios.map((e) => ({ key: uid(), nombre: e.nombre, series: e.series, repeticiones: e.repeticiones, descanso: e.descanso, nota: e.nota, video: e.video })) }))
      : [{ key: uid(), nombre: "Día A", ejercicios: [vacio()] }],
  )
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()

  const porClave = new Map(biblioteca.map((b) => [claveEjercicio(b.nombre), b]))
  const sugerencias = [...biblioteca.map((b) => b.nombre), ...EJERCICIOS_BASE.map((b) => b.nombre).filter((n) => !porClave.has(claveEjercicio(n)))]

  const [selector, setSelector] = useState<number | null>(null)
  /** Suma los ejercicios elegidos del catálogo al día, reemplazando las filas vacías y sin pasar de 40. */
  const agregarElegidos = (di: number, elegidos: EjercicioElegido[]) => {
    setDias((ds) =>
      ds.map((d, i) => {
        if (i !== di) return d
        const llenos = d.ejercicios.filter((e) => e.nombre.trim() || e.series.trim() || e.repeticiones.trim() || e.descanso.trim() || e.nota.trim())
        return { ...d, ejercicios: [...llenos, ...elegidos.map((e) => ({ ...vacio(), nombre: e.nombre, video: e.video }))].slice(0, 40) }
      }),
    )
    setSelector(null)
  }

  const cambiarDia = (di: number, cambio: Partial<DiaForm>) => setDias((ds) => ds.map((d, i) => (i === di ? { ...d, ...cambio } : d)))
  const cambiarEj = (di: number, ei: number, cambio: Partial<EjercicioForm>) =>
    setDias((ds) => ds.map((d, i) => (i === di ? { ...d, ejercicios: d.ejercicios.map((e, j) => (j === ei ? { ...e, ...cambio } : e)) } : d)))

  function guardar() {
    const limpio = {
      nombre,
      descripcion: "",
      dias: dias.map((d) => ({
        nombre: d.nombre,
        ejercicios: d.ejercicios
          .filter((e) => e.nombre.trim() || e.series.trim() || e.repeticiones.trim() || e.descanso.trim() || e.nota.trim())
          .map(({ nombre: n, series, repeticiones, descanso, nota, video }) => ({ nombre: n, series, repeticiones, descanso, nota, video })),
      })),
    }
    const r = rutinaSchema.safeParse(limpio)
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Revisá los datos.")
    setError(undefined)
    start(async () => {
      const res = await onGuardar(r.data)
      if (!res.ok) setError(res.mensaje)
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 pb-28">
      <button onClick={onCancelar} className="-my-2 inline-flex min-h-11 items-center gap-1.5 self-start pr-3 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Cancelar
      </button>

      <div>
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">{rutina ? "Editar mi rutina" : "Mi rutina"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Solo la ves vos: ni el gimnasio ni otros socios pueden verla.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nombre de la rutina
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Mi rutina de verano" maxLength={80} className="h-12 text-base" autoFocus={!rutina} />
      </label>

      {dias.map((dia, di) => (
        <section key={dia.key} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Input aria-label={`Nombre del día ${di + 1}`} value={dia.nombre} onChange={(e) => cambiarDia(di, { nombre: e.target.value })} placeholder="Ej.: Día A · Pecho" maxLength={60} className="h-11 font-semibold" />
            <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Quitar el día" disabled={dias.length === 1} onClick={() => setDias((ds) => ds.filter((_, i) => i !== di))}>
              <Trash2 />
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {dia.ejercicios.map((ej, ei) => (
              <div key={ej.key} className="rounded-xl bg-muted/40 p-3">
                <Input
                  aria-label="Ejercicio"
                  list="ejercicios-sugeridos-socio"
                  value={ej.nombre}
                  onChange={(ev) => {
                    const nombre = ev.target.value
                    const guardado = porClave.get(claveEjercicio(nombre))
                    cambiarEj(di, ei, guardado && !ej.video ? { nombre, video: guardado.video } : { nombre })
                  }}
                  placeholder="Ejercicio (ej.: Sentadilla)"
                  maxLength={80}
                  className="h-11"
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input aria-label="Series" inputMode="numeric" value={ej.series} onChange={(e) => cambiarEj(di, ei, { series: e.target.value })} placeholder="Series" maxLength={40} className="h-11 text-center" />
                  <Input aria-label="Repeticiones" value={ej.repeticiones} onChange={(e) => cambiarEj(di, ei, { repeticiones: e.target.value })} placeholder="Reps" maxLength={40} className="h-11 text-center" />
                  <Input aria-label="Descanso" value={ej.descanso} onChange={(e) => cambiarEj(di, ei, { descanso: e.target.value })} placeholder="Descanso" maxLength={40} className="h-11 text-center" />
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Input aria-label="Nota" value={ej.nota} onChange={(e) => cambiarEj(di, ei, { nota: e.target.value })} placeholder="Nota (opcional)" maxLength={300} className="h-10 min-w-0 text-sm" />
                  <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label="Subir el ejercicio" disabled={ei === 0} onClick={() => cambiarDia(di, { ejercicios: mover(dia.ejercicios, ei, -1) })}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label="Bajar el ejercicio" disabled={ei === dia.ejercicios.length - 1} onClick={() => cambiarDia(di, { ejercicios: mover(dia.ejercicios, ei, 1) })}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label="Quitar el ejercicio" onClick={() => cambiarDia(di, { ejercicios: dia.ejercicios.filter((_, j) => j !== ei) })}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="lg" onClick={() => setSelector(di)} disabled={dia.ejercicios.length >= 40}>
              <LayoutGrid /> Elegir del catálogo
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => cambiarDia(di, { ejercicios: [...dia.ejercicios, vacio()] })} disabled={dia.ejercicios.length >= 40}>
              <Plus /> Agregar ejercicio
            </Button>
          </div>
        </section>
      ))}

      <Button type="button" size="lg" variant="outline" className="self-start" disabled={dias.length >= 14} onClick={() => setDias((ds) => [...ds, { key: uid(), nombre: `Día ${LETRAS[ds.length] ?? ds.length + 1}`, ejercicios: [vacio()] }])}>
        <Plus /> Agregar día
      </Button>

      {selector !== null && <SelectorEjercicio biblioteca={biblioteca} onAgregar={(el) => agregarElegidos(selector, el)} onCerrar={() => setSelector(null)} />}

      <datalist id="ejercicios-sugeridos-socio">
        {sugerencias.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-5 pt-3 pb-4 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm font-medium text-bad">
              {error}
            </p>
          )}
          <Button size="lg" className="h-14 text-lg" onClick={guardar} disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar rutina"}
          </Button>
        </div>
      </div>
    </div>
  )
}
