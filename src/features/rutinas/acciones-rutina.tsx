"use client"

import { useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Archive, ArchiveRestore, Copy, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { archivarRutina, duplicarRutina } from "@/lib/actions"

/** Botones de cada rutina en la lista: editar, duplicar y archivar/restaurar. */
export function AccionesRutina({ id, nombre, activo }: { id: string; nombre: string; activo: boolean }) {
  const [pendiente, start] = useTransition()
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm">
        <Link href={`/rutinas/${id}`}>
          <Pencil /> Editar
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pendiente}
        onClick={() =>
          start(async () => {
            const r = await duplicarRutina(id)
            if (r.ok) toast.success(`Se creó una copia de “${nombre}”.`)
            else toast.error(r.error)
          })
        }
      >
        <Copy /> Duplicar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pendiente}
        onClick={() =>
          start(async () => {
            const r = await archivarRutina(id, !activo)
            if (r.ok) toast.success(activo ? `“${nombre}” se archivó: ya no se ofrece ni la ven los socios.` : `“${nombre}” volvió a estar activa.`)
            else toast.error(r.error)
          })
        }
      >
        {activo ? <Archive /> : <ArchiveRestore />} {activo ? "Archivar" : "Restaurar"}
      </Button>
    </div>
  )
}
