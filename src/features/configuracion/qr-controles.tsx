"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Copy, Printer, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cambiarEstadoQR, regenerarQR } from "@/lib/actions"

export function QRControles({ activo, url }: { activo: boolean; url: string }) {
  const [confirmar, setConfirmar] = useState(false)
  const [pendiente, start] = useTransition()

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <span>
          <span className="block font-semibold">Ingreso con QR activado</span>
          <span className="text-sm text-muted-foreground">Si lo pausás, el QR muestra un aviso para pasar por recepción.</span>
        </span>
        <Switch
          checked={activo}
          disabled={pendiente}
          onCheckedChange={(v) =>
            start(async () => {
              const r = await cambiarEstadoQR(v)
              if (r.ok) toast.success(v ? "Ingreso con QR activado." : "Ingreso con QR pausado.")
              else toast.error(r.error)
            })
          }
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/cartel-qr" target="_blank">
            <Printer /> Imprimir cartel
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url)
              toast.success("Enlace copiado.")
            } catch {
              toast.error("No se pudo copiar. Seleccioná el enlace a mano.")
            }
          }}
        >
          <Copy /> Copiar enlace
        </Button>
        <Button variant="ghost" onClick={() => setConfirmar(true)}>
          <RefreshCw /> Generar QR nuevo
        </Button>
      </div>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Generar un QR nuevo?</DialogTitle>
            <DialogDescription>
              El QR que está pegado deja de funcionar y vas a tener que imprimir el cartel otra vez. Usalo si el QR se difundió fuera del gimnasio.
              Los celulares ya vinculados siguen reconocidos con el QR nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={() =>
                start(async () => {
                  const r = await regenerarQR()
                  if (!r.ok) return void toast.error(r.error)
                  toast.success("QR nuevo generado. Imprimí el cartel de nuevo.")
                  setConfirmar(false)
                })
              }
            >
              Generar QR nuevo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
