"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CATALOGO, EQUIPOS, MUSCULOS, etiquetaEquipo, etiquetaMusculo, fotoEjercicio, type EquipoId, type MusculoId } from "@/lib/catalogo-ejercicios"
import { claveEjercicio } from "@/lib/ejercicios-base"
import { cn } from "@/lib/utils"

export interface EjercicioElegido {
  nombre: string
  video: string
}

interface Item {
  clave: string
  nombre: string
  video: string
  /** id del catálogo si tiene foto. */
  foto?: string
  musculo?: MusculoId
  secundarios: MusculoId[]
  equipo?: EquipoId
  propio: boolean
}

/** Foto redonda del ejercicio; si no carga (sin conexión) muestra la inicial. */
export function Miniatura({ id, nombre, className }: { id?: string; nombre: string; className?: string }) {
  const [falla, setFalla] = useState(false)
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-white text-sm font-bold text-neutral-500", className)}>
      {id && !falla ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotoEjercicio(id)} alt="" loading="lazy" onError={() => setFalla(true)} className="size-full object-cover" />
      ) : (
        nombre.charAt(0).toUpperCase()
      )}
    </span>
  )
}

/**
 * Selector de ejercicios con foto, buscador y filtros por músculo y equipamiento.
 * Muestra primero los de la biblioteca del gimnasio (con su video) y después el catálogo.
 */
export function SelectorEjercicio({
  biblioteca,
  onAgregar,
  onCerrar,
}: {
  biblioteca: { nombre: string; video: string }[]
  onAgregar: (elegidos: EjercicioElegido[]) => void
  onCerrar: () => void
}) {
  const [buscar, setBuscar] = useState("")
  const [musculo, setMusculo] = useState<MusculoId | null>(null)
  const [equipo, setEquipo] = useState<EquipoId | "">("")
  const [elegidos, setElegidos] = useState<string[]>([])
  const [abierto, setAbierto] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    entrada.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar()
    document.addEventListener("keydown", alTeclear)
    const previo = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", alTeclear)
      document.body.style.overflow = previo
    }
  }, [onCerrar])

  const items = useMemo<Item[]>(() => {
    const video = new Map(biblioteca.map((b) => [claveEjercicio(b.nombre), b.video]))
    const catalogo: Item[] = CATALOGO.map((e) => ({
      clave: claveEjercicio(e.nombre),
      nombre: e.nombre,
      video: video.get(claveEjercicio(e.nombre)) ?? "",
      foto: e.id,
      musculo: e.musculo,
      secundarios: e.secundarios,
      equipo: e.equipo,
      propio: false,
    }))
    const enCatalogo = new Set(catalogo.map((c) => c.clave))
    const propios: Item[] = biblioteca
      .filter((b) => !enCatalogo.has(claveEjercicio(b.nombre)))
      .map((b) => ({ clave: claveEjercicio(b.nombre), nombre: b.nombre, video: b.video, secundarios: [], propio: true }))
    return [...propios, ...catalogo]
  }, [biblioteca])

  const texto = claveEjercicio(buscar)
  const visibles = items.filter((i) => {
    if (texto && !i.clave.includes(texto)) return false
    if (musculo && i.musculo !== musculo && !i.secundarios.includes(musculo)) return false
    if (equipo && i.equipo !== equipo) return false
    return true
  })
  // Con un músculo elegido, los que lo trabajan como principal van antes que los de apoyo.
  if (musculo) visibles.sort((a, b) => Number(b.musculo === musculo) - Number(a.musculo === musculo))

  const alternar = (clave: string) => setElegidos((l) => (l.includes(clave) ? l.filter((c) => c !== clave) : [...l, clave]))
  const agregar = () => {
    const porClave = new Map(items.map((i) => [i.clave, i]))
    onAgregar(elegidos.flatMap((c) => (porClave.get(c) ? [{ nombre: porClave.get(c)!.nombre, video: porClave.get(c)!.video }] : [])))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-6" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Elegir ejercicios"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full flex-col bg-background sm:max-h-[min(46rem,100%)] sm:max-w-xl sm:rounded-2xl sm:border sm:shadow-2xl"
      >
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="flex-1 text-base font-semibold">Elegir ejercicios</h2>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onCerrar}>
            <X />
          </Button>
        </header>

        <div className="flex flex-col gap-3 px-4 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={entrada}
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar ejercicio"
              aria-label="Buscar ejercicio"
              className="h-11 w-full rounded-lg border bg-muted/40 pr-3 pl-9 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por músculo">
            <Chip activo={musculo === null} onClick={() => setMusculo(null)}>
              Todos
            </Chip>
            {MUSCULOS.map((m) => (
              <Chip key={m.id} activo={musculo === m.id} onClick={() => setMusculo(musculo === m.id ? null : m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Equipamiento
            <select value={equipo} onChange={(e) => setEquipo(e.target.value as EquipoId | "")} className="h-9 flex-1 rounded-lg border bg-background px-2 text-sm text-foreground">
              <option value="">Todo</option>
              {EQUIPOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul className="mt-2 flex-1 overflow-y-auto border-t" aria-label="Ejercicios">
          {visibles.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">No hay ejercicios con ese filtro. Podés escribir el nombre a mano en la rutina.</li>}
          {visibles.map((i) => {
            const marcado = elegidos.includes(i.clave)
            const expandido = abierto === i.clave
            return (
              <li key={i.clave} className="border-b last:border-b-0">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <button type="button" onClick={() => alternar(i.clave)} aria-pressed={marcado} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Miniatura id={i.foto} nombre={i.nombre} className="size-12" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{i.nombre}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {i.propio ? "De tu gimnasio" : `${etiquetaMusculo(i.musculo!)} · ${etiquetaEquipo(i.equipo!)}`}
                        {i.video && !i.propio && " · con video"}
                      </span>
                    </span>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", marcado ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                      {marcado && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                  {i.foto && (
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ver cómo se hace ${i.nombre}`} aria-expanded={expandido} onClick={() => setAbierto(expandido ? null : i.clave)}>
                      <ChevronDown className={cn("transition-transform", expandido && "rotate-180")} />
                    </Button>
                  )}
                </div>
                {expandido && i.foto && (
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      {([0, 1] as const).map((n) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={n} src={fotoEjercicio(i.foto!, n)} alt={`${i.nombre}, posición ${n === 0 ? "inicial" : "final"}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg bg-white object-cover" />
                      ))}
                    </div>
                    {i.secundarios.length > 0 && <p className="mt-2 text-xs text-muted-foreground">También trabaja: {i.secundarios.map(etiquetaMusculo).join(", ")}.</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <footer className="border-t px-4 py-3">
          <Button type="button" size="lg" className="h-12 w-full text-base" disabled={elegidos.length === 0} onClick={agregar}>
            {elegidos.length === 0 ? "Elegí uno o más ejercicios" : `Agregar ${elegidos.length} ${elegidos.length === 1 ? "ejercicio" : "ejercicios"}`}
          </Button>
        </footer>
      </div>
    </div>
  )
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", activo ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  )
}
