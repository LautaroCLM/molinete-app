"use client"

import { useRef, useTransition } from "react"
import { toast } from "sonner"
import { ImageUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/shared/page-header"
import { GymAvatar } from "@/components/layout/gym-avatar"
import { quitarLogo, subirLogo } from "@/lib/actions"
import type { Gym } from "@/types/domain"

const LADO = 256

/** Recorta al centro en cuadrado y achica a 256 px (WebP): liviano y sin deformarse. */
async function prepararImagen(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo)
  const lado = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = LADO
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("No se pudo procesar la imagen."))), "image/webp", 0.9))
}

export function LogoGimnasio({ gym }: { gym: Gym }) {
  const input = useRef<HTMLInputElement>(null)
  const [pendiente, start] = useTransition()

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ""
    if (!archivo) return
    if (!archivo.type.startsWith("image/")) return void toast.error("Elegí una imagen PNG, JPG o WebP.")
    start(async () => {
      try {
        const blob = await prepararImagen(archivo)
        const datos = new FormData()
        datos.set("logo", new File([blob], "logo.webp", { type: "image/webp" }))
        const r = await subirLogo(datos)
        if (r.ok) toast.success("Logo actualizado.")
        else toast.error(r.error)
      } catch {
        toast.error("No pudimos leer esa imagen. Probá con otra.")
      }
    })
  }

  return (
    <Panel titulo="Logo" descripcion="Aparece en el menú y en el encabezado. Se recorta cuadrado.">
      <div className="flex items-center gap-4">
        <GymAvatar nombre={gym.nombre} logoUrl={gym.logoUrl} className="size-20 rounded-xl text-xl" />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={elegir} aria-label="Elegir logo" />
            <Button variant="outline" type="button" disabled={pendiente} onClick={() => input.current?.click()}>
              <ImageUp /> {gym.logoUrl ? "Cambiar logo" : "Subir logo"}
            </Button>
            {gym.logoUrl && (
              <Button
                variant="ghost"
                type="button"
                disabled={pendiente}
                onClick={() =>
                  start(async () => {
                    const r = await quitarLogo()
                    if (r.ok) toast.success("Logo quitado.")
                    else toast.error(r.error)
                  })
                }
              >
                <Trash2 /> Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPG o WebP, hasta 1 MB. Si no subís uno, se usan las iniciales.</p>
        </div>
      </div>
    </Panel>
  )
}
