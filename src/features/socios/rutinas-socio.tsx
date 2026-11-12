"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Dumbbell, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Panel } from "@/components/shared/page-header"
import { asignarRutina, quitarRutina } from "@/lib/actions"
import { fecha } from "@/lib/format"

export interface RutinaAsignada {
  id: string
  nombre: string
  asignadaEn: string
  activo: boolean
}

/** Rutinas del socio en su ficha: asignar y quitar. El socio las ve en su perfil. */
export function RutinasSocio({
  socioId,
  asignadas,
  disponibles,
}: {
  socioId: string
  asignadas: RutinaAsignada[]
  disponibles: { id: string; nombre: string }[]
}) {
  const [abierto, setAbierto] = useState(false)
  const [elegida, setElegida] = useState("")
  const [pendiente, start] = useTransition()
  const libres = disponibles.filter((d) => !asignadas.some((a) => a.id === d.id))

  return (
    <Panel
      titulo="Rutinas"
      descripcion="Las ve en su perfil: le toca el día siguiente cada vez que viene."
      accion={
        <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
          <Plus /> Asignar
        </Button>
      }
    >
      {asignadas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no tiene rutinas asignadas.</p>
      ) : (
        <ul className="divide-y">
          {asignadas.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <Dumbbell className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.nombre}
                  {!r.activo && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Archivada</span>}
                </p>
                <p className="text-xs text-muted-foreground">Desde el {fecha(r.asignadaEn)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar ${r.nombre}`}
                disabled={pendiente}
                onClick={() =>
                  start(async () => {
                    const res = await quitarRutina(socioId, r.id)
                    if (res.ok) toast.success("Rutina quitada.")
                    else toast.error(res.error)
                  })
                }
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar una rutina</DialogTitle>
            <DialogDescription>El socio la va a ver en su perfil. Puede tener más de una.</DialogDescription>
          </DialogHeader>
          {libres.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay rutinas para asignar.{" "}
              <Link href="/rutinas/nueva" className="font-medium text-foreground underline underline-offset-4">
                Creá una
              </Link>
              .
            </p>
          ) : (
            <Select value={elegida} onValueChange={setElegida}>
              <SelectTrigger aria-label="Rutina">
                <SelectValue placeholder="Elegí una rutina" />
              </SelectTrigger>
              <SelectContent>
                {libres.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={pendiente || !elegida}
              onClick={() =>
                start(async () => {
                  const res = await asignarRutina(socioId, elegida)
                  if (!res.ok) return void toast.error(res.error)
                  toast.success("Rutina asignada.")
                  setElegida("")
                  setAbierto(false)
                })
              }
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  )
}
