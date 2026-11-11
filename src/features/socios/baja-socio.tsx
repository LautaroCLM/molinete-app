"use client"

import { useState, useTransition } from "react"
import { cambiarEstadoSocio } from "@/lib/actions"
import { toast } from "sonner"
import { UserX, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function BajaSocioBoton({ id, nombre, activo }: { id: string; nombre: string; activo: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, start] = useTransition()
  const cambiar = (nuevo: boolean) =>
    start(async () => {
      const r = await cambiarEstadoSocio(id, nuevo)
      if (!r.ok) return void toast.error(r.error)
      toast.success(nuevo ? `${nombre} volvió a estar activo.` : `${nombre} quedó dado de baja.`)
      setAbierto(false)
    })
  if (!activo)
    return (
      <Button variant="outline" disabled={pendiente} onClick={() => cambiar(true)}>
        <UserCheck /> Reactivar socio
      </Button>
    )
  return (
    <>
      <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => setAbierto(true)}>
        <UserX /> Dar de baja
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Dar de baja a {nombre}?</DialogTitle>
            <DialogDescription>
              Deja de aparecer como activo y no cuenta en los vencimientos. Su historial de pagos y asistencias se conserva, y lo podés
              reactivar cuando vuelva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={() => cambiar(false)}
            >
              Dar de baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
