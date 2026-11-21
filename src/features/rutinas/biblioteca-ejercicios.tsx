"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { BotonVideo } from "@/components/shared/video-tecnica"
import { eliminarEjercicioBiblioteca, guardarEjercicioBiblioteca } from "@/lib/actions"
import { etiquetaMusculo, MUSCULOS, musculosDeNombre, type MusculoId } from "@/lib/catalogo-ejercicios"
import { claveEjercicio, EJERCICIOS_BASE } from "@/lib/ejercicios-base"
import { ejercicioBibliotecaSchema } from "@/lib/schemas"
import type { EjercicioBiblioteca } from "@/lib/data"

/** Ejercicios propios del gimnasio: nombre, músculo y video de técnica. Se sugieren al armar rutinas. */
export function BibliotecaEjercicios({ ejercicios }: { ejercicios: EjercicioBiblioteca[] }) {
  const [q, setQ] = useState("")
  const [editando, setEditando] = useState<EjercicioBiblioteca | "nuevo" | null>(null)
  const n = claveEjercicio(q)
  const lista = ejercicios.filter((e) => !n || claveEjercicio(`${e.nombre} ${e.grupo}`).includes(n))

  return (
    <Panel
      titulo="Tus ejercicios"
      descripcion={`Además de estos, al armar una rutina se sugieren ${EJERCICIOS_BASE.length} ejercicios comunes. Agregá acá los tuyos, con su músculo y su video: el músculo hace que cuenten en la figura del cuerpo de tus socios.`}
      accion={
        <Button onClick={() => setEditando("nuevo")}>
          <Plus /> Agregar ejercicio
        </Button>
      }
      contenidoClassName="px-0 pb-0"
    >
      {ejercicios.length > 0 && (
        <div className="relative mx-5 mb-3 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio…" aria-label="Buscar ejercicio" className="pl-9" />
        </div>
      )}
      {ejercicios.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground">Todavía no agregaste ejercicios propios. Se usan los comunes mientras tanto.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 text-xs">Ejercicio</TableHead>
              <TableHead className="hidden text-xs sm:table-cell">Músculo</TableHead>
              <TableHead className="text-xs">Video</TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  No encontramos ese ejercicio.
                </TableCell>
              </TableRow>
            ) : (
              lista.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="pl-5 font-medium">{e.nombre}</TableCell>
                  <TableCell className="hidden sm:table-cell">{celdaMusculo(e)}</TableCell>
                  <TableCell>{e.video ? <BotonVideo url={e.video} nombre={e.nombre} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${e.nombre}`} onClick={() => setEditando(e)}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      {editando && <FormularioEjercicio key={editando === "nuevo" ? "nuevo" : editando.id} ejercicio={editando === "nuevo" ? null : editando} cerrar={() => setEditando(null)} />}
    </Panel>
  )
}

/** Músculo del ejercicio: el del catálogo de la app si es uno conocido; si no, el que le asignó el gimnasio. Sin ninguno, un aviso. */
function celdaMusculo(e: EjercicioBiblioteca) {
  const conocido = musculosDeNombre(e.nombre)?.musculo ?? e.musculo
  if (conocido) return <span className="text-muted-foreground">{etiquetaMusculo(conocido)}</span>
  return (
    <span title="No cuenta en la figura del cuerpo de los socios. Editalo para elegir un músculo." className="inline-flex rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
      Sin músculo
    </span>
  )
}

function FormularioEjercicio({ ejercicio, cerrar }: { ejercicio: EjercicioBiblioteca | null; cerrar: () => void }) {
  const [nombre, setNombre] = useState(ejercicio?.nombre ?? "")
  const [musculo, setMusculo] = useState<MusculoId | "">(ejercicio?.musculo ?? "")
  const [video, setVideo] = useState(ejercicio?.video ?? "")
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()
  const conocido = musculosDeNombre(nombre)

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ejercicio ? "Editar ejercicio" : "Agregar ejercicio"}</DialogTitle>
          <DialogDescription>El video es opcional: un enlace de YouTube o Vimeo con la técnica.</DialogDescription>
        </DialogHeader>
        <form
          id="form-ejercicio"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            // Con músculo elegido, el grupo pasa a ser su nombre; si no, se conserva el grupo que ya tenía (por ejemplo "Cardio").
            const grupo = musculo ? etiquetaMusculo(musculo) : (ejercicio?.grupo ?? "")
            const r = ejercicioBibliotecaSchema.safeParse({ nombre, grupo, musculo, video })
            if (!r.success) return setError(r.error.issues[0]?.message)
            setError(undefined)
            start(async () => {
              const res = await guardarEjercicioBiblioteca(r.data)
              if (!res.ok) return setError(res.error)
              toast.success("Ejercicio guardado.")
              cerrar()
            })
          }}
        >
          <Field label="Nombre" htmlFor="ej-nombre">
            <Input id="ej-nombre" list="ejercicios-comunes" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Hip thrust" maxLength={80} autoFocus />
            <datalist id="ejercicios-comunes">
              {EJERCICIOS_BASE.map((b) => (
                <option key={b.nombre} value={b.nombre} />
              ))}
            </datalist>
          </Field>
          {conocido ? (
            <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
              Este ejercicio ya está en el catálogo de la app: trabaja <strong className="text-foreground">{etiquetaMusculo(conocido.musculo)}</strong>
              {conocido.secundarios.length > 0 && ` (y ayudan ${conocido.secundarios.map((m) => etiquetaMusculo(m).toLowerCase()).join(", ")})`}.
            </p>
          ) : (
            <Field label="Músculo principal (opcional)" htmlFor="ej-musculo" hint="Hace que este ejercicio cuente en la figura del cuerpo de tus socios.">
              <select id="ej-musculo" value={musculo} onChange={(e) => setMusculo(e.target.value as MusculoId | "")} className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm">
                <option value="">Sin asignar</option>
                {MUSCULOS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Video de técnica (opcional)" htmlFor="ej-video">
            <Input id="ej-video" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" maxLength={300} />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
              {error}
            </p>
          )}
        </form>
        <DialogFooter className="sm:justify-between">
          {ejercicio ? (
            <Button
              type="button"
              variant="ghost"
              className="text-bad"
              disabled={pendiente}
              onClick={() =>
                start(async () => {
                  const res = await eliminarEjercicioBiblioteca(ejercicio.id)
                  if (!res.ok) return setError(res.error)
                  toast.success("Ejercicio eliminado de la biblioteca. Las rutinas que lo usan no cambian.")
                  cerrar()
                })
              }
            >
              <Trash2 /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" form="form-ejercicio" disabled={pendiente}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
