"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { restablecerPin } from "@/lib/actions"

/** PIN con el que el socio entra a su perfil desde el QR. Dueño y recepción pueden restablecerlo. */
export function PinSocio({ socioId, nombre, tienePin }: { socioId: string; nombre: string; tienePin: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, start] = useTransition()

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">
        <KeyRound className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">PIN de su perfil</dt>
        <dd className="font-medium">{tienePin ? "Configurado" : "Sin configurar"}</dd>
      </div>
      {tienePin && (
        <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
          Restablecer
        </Button>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Restablecer el PIN de {nombre}?</DialogTitle>
            <DialogDescription>
              Se borra su PIN y se cierra la sesión en sus celulares. La próxima vez que escanee el QR va a ingresar su DNI y elegir un PIN nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              disabled={pendiente}
              onClick={() =>
                start(async () => {
                  const r = await restablecerPin(socioId)
                  if (!r.ok) return void toast.error(r.error)
                  toast.success(`Listo: ${nombre} elegirá un PIN nuevo la próxima vez.`)
                  setAbierto(false)
                })
              }
            >
              Restablecer PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
