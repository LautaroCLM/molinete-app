"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowDown, ArrowLeft, ArrowUp, BookmarkPlus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { guardarEjercicioBiblioteca, guardarRutina } from "@/lib/actions"
import { claveEjercicio, EJERCICIOS_BASE } from "@/lib/ejercicios-base"
import { rutinaSchema } from "@/lib/schemas"
import type { EjercicioBiblioteca } from "@/lib/data"
import type { Rutina } from "@/types/domain"

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
const ejercicioVacio = (): EjercicioForm => ({ key: uid(), nombre: "", series: "", repeticiones: "", descanso: "", nota: "", video: "" })
const NOMBRES_DIA = "ABCDEFGHIJKLMN"

function mover<T>(lista: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= lista.length) return lista
  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}

/** Editor de una rutina: nombre, días y ejercicios escritos a mano. */
export function RutinaEditor({ rutina, biblioteca }: { rutina?: Rutina; biblioteca: EjercicioBiblioteca[] }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(rutina?.nombre ?? "")
  const [descripcion, setDescripcion] = useState(rutina?.descripcion ?? "")
  const [dias, setDias] = useState<DiaForm[]>(() =>
    rutina?.dias.length
      ? rutina.dias.map((d) => ({ key: uid(), nombre: d.nombre, ejercicios: d.ejercicios.map((e) => ({ key: uid(), ...e })) }))
      : [{ key: uid(), nombre: "Día A", ejercicios: [ejercicioVacio()] }],
  )
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()
  // Sugerencias al escribir: la biblioteca del gimnasio primero y después los ejercicios comunes.
  const [propios, setPropios] = useState(biblioteca)
  const porClave = new Map(propios.map((b) => [claveEjercicio(b.nombre), b]))
  const sugerencias = [...propios.map((b) => b.nombre), ...EJERCICIOS_BASE.map((b) => b.nombre).filter((n) => !porClave.has(claveEjercicio(n)))]

  const cambiarDia = (di: number, cambio: Partial<DiaForm>) => setDias((ds) => ds.map((d, i) => (i === di ? { ...d, ...cambio } : d)))
  const cambiarEjercicio = (di: number, ei: number, cambio: Partial<EjercicioForm>) =>
    setDias((ds) => ds.map((d, i) => (i === di ? { ...d, ejercicios: d.ejercicios.map((e, j) => (j === ei ? { ...e, ...cambio } : e)) } : d)))

  function guardar() {
    // Las filas de ejercicio totalmente vacías se descartan.
    const limpio = {
      nombre,
      descripcion,
      dias: dias.map((d) => ({
        nombre: d.nombre,
        ejercicios: d.ejercicios
          .filter((e) => e.nombre.trim() || e.series.trim() || e.repeticiones.trim() || e.descanso.trim() || e.nota.trim() || e.video.trim())
          .map(({ nombre: n, series, repeticiones, descanso, nota, video }) => ({ nombre: n, series, repeticiones, descanso, nota, video })),
      })),
    }
    const r = rutinaSchema.safeParse(limpio)
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Revisá los datos.")
    setError(undefined)
    start(async () => {
      const res = await guardarRutina(r.data, rutina?.id)
      if (!res.ok) return setError(res.error)
      toast.success("Rutina guardada.")
      router.push("/rutinas")
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Link href="/rutinas" className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Rutinas
      </Link>

      <section className="surface grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <Field label="Nombre de la rutina" htmlFor="rutina-nombre">
          <Input id="rutina-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Rutina 1 · Hipertrofia" maxLength={80} autoFocus={!rutina} />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="rutina-desc">
          <Input id="rutina-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej.: 3 días por semana, nivel inicial" maxLength={300} />
        </Field>
      </section>

      <div className="flex flex-col gap-4">
        {dias.map((dia, di) => (
          <section key={dia.key} className="surface rounded-xl border bg-card">
            <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <Input
                aria-label={`Nombre del día ${di + 1}`}
                value={dia.nombre}
                onChange={(e) => cambiarDia(di, { nombre: e.target.value })}
                placeholder="Ej.: Día A · Pecho y tríceps"
                maxLength={60}
                className="h-9 max-w-xs font-semibold"
              />
              <div className="ml-auto flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir el día" disabled={di === 0} onClick={() => setDias((ds) => mover(ds, di, -1))}>
                  <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Bajar el día" disabled={di === dias.length - 1} onClick={() => setDias((ds) => mover(ds, di, 1))}>
                  <ArrowDown />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar el día" disabled={dias.length === 1} onClick={() => setDias((ds) => ds.filter((_, i) => i !== di))}>
                  <Trash2 />
                </Button>
              </div>
            </header>

            <div className="flex flex-col gap-3 p-4">
              {dia.ejercicios.length > 0 && (
                <div className="hidden grid-cols-[1fr_5.5rem_6.5rem_6.5rem_6.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
                  <span>Ejercicio</span>
                  <span>Series</span>
                  <span>Repeticiones</span>
                  <span>Descanso</span>
                  <span />
                </div>
              )}
              {dia.ejercicios.map((ej, ei) => (
                <div key={ej.key} className="rounded-lg border bg-muted/30 p-2.5">
                  <div className="grid gap-2 md:grid-cols-[1fr_5.5rem_6.5rem_6.5rem_6.5rem]">
                    <Input
                      aria-label="Ejercicio"
                      list="ejercicios-sugeridos"
                      value={ej.nombre}
                      onChange={(ev) => {
                        const nombre = ev.target.value
                        const guardado = porClave.get(claveEjercicio(nombre))
                        // si elige uno de la biblioteca y todavía no tiene video, se lo trae
                        cambiarEjercicio(di, ei, guardado && !ej.video ? { nombre, video: guardado.video } : { nombre })
                      }}
                      placeholder="Ej.: Press de banca"
                      maxLength={80}
                    />
                    <div className="grid grid-cols-3 gap-2 md:contents">
                      <Input aria-label="Series" value={ej.series} onChange={(e) => cambiarEjercicio(di, ei, { series: e.target.value })} placeholder="Series" maxLength={40} />
                      <Input aria-label="Repeticiones" value={ej.repeticiones} onChange={(e) => cambiarEjercicio(di, ei, { repeticiones: e.target.value })} placeholder="Reps" maxLength={40} />
                      <Input aria-label="Descanso" value={ej.descanso} onChange={(e) => cambiarEjercicio(di, ei, { descanso: e.target.value })} placeholder="Descanso" maxLength={40} />
                    </div>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir el ejercicio" disabled={ei === 0} onClick={() => cambiarDia(di, { ejercicios: mover(dia.ejercicios, ei, -1) })}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Bajar el ejercicio" disabled={ei === dia.ejercicios.length - 1} onClick={() => cambiarDia(di, { ejercicios: mover(dia.ejercicios, ei, 1) })}>
                        <ArrowDown />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar el ejercicio" onClick={() => cambiarDia(di, { ejercicios: dia.ejercicios.filter((_, j) => j !== ei) })}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <Input
                      aria-label="Nota del ejercicio"
                      value={ej.nota}
                      onChange={(e) => cambiarEjercicio(di, ei, { nota: e.target.value })}
                      placeholder="Nota (opcional): técnica, peso sugerido…"
                      maxLength={300}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Input
                        aria-label="Video de técnica del ejercicio"
                        value={ej.video}
                        onChange={(e) => cambiarEjercicio(di, ei, { video: e.target.value })}
                        placeholder="Video de técnica (enlace de YouTube o Vimeo, opcional)"
                        maxLength={300}
                        inputMode="url"
                        className="h-8 text-xs"
                      />
                      {ej.nombre.trim().length >= 2 && ej.video.trim() && porClave.get(claveEjercicio(ej.nombre))?.video !== ej.video.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Guardar este ejercicio y su video en la biblioteca"
                          title="Guardar en la biblioteca para reutilizarlo"
                          onClick={async () => {
                            const r = await guardarEjercicioBiblioteca({ nombre: ej.nombre, grupo: porClave.get(claveEjercicio(ej.nombre))?.grupo ?? "", video: ej.video })
                            if (!r.ok) return void toast.error(r.error)
                            setPropios((p) => [...p.filter((b) => claveEjercicio(b.nombre) !== claveEjercicio(ej.nombre)), { id: ej.key, nombre: ej.nombre.trim(), grupo: porClave.get(claveEjercicio(ej.nombre))?.grupo ?? "", video: ej.video.trim() }])
                            toast.success("Guardado en la biblioteca.")
                          }}
                        >
                          <BookmarkPlus />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => cambiarDia(di, { ejercicios: [...dia.ejercicios, ejercicioVacio()] })}>
                <Plus /> Agregar ejercicio
              </Button>
            </div>
          </section>
        ))}

        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={dias.length >= 14}
          onClick={() => setDias((ds) => [...ds, { key: uid(), nombre: `Día ${NOMBRES_DIA[ds.length] ?? ds.length + 1}`, ejercicios: [ejercicioVacio()] }])}
        >
          <Plus /> Agregar día
        </Button>
      </div>

      <datalist id="ejercicios-sugeridos">
        {sugerencias.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {error && (
          <p role="alert" className="mr-auto text-sm font-medium text-bad">
            {error}
          </p>
        )}
        <Button variant="outline" asChild>
          <Link href="/rutinas">Cancelar</Link>
        </Button>
        <Button onClick={guardar} disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar rutina"}
        </Button>
      </div>
    </div>
  )
}
