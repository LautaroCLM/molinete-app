"use client"

import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

/** De un enlace de YouTube o Vimeo, arma la dirección para incrustarlo. Devuelve null si no se puede. */
export function embedDeVideo(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^(www|m|music)\./, "")
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0]
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const partes = u.pathname.split("/").filter(Boolean)
      const id = u.searchParams.get("v") ?? (["shorts", "embed", "live"].includes(partes[0]) ? partes[1] : null)
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).find((p) => /^\d+$/.test(p))
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    // enlace mal escrito: no se muestra el video
  }
  return null
}

/** Botón "Ver técnica": abre el video del ejercicio dentro de la pantalla (o lo lleva al sitio si no se puede incrustar). */
export function BotonVideo({ url, nombre, className }: { url: string; nombre: string; className?: string }) {
  if (!url) return null
  const embed = embedDeVideo(url)
  if (!embed) {
    return (
      <Button asChild variant="outline" size="xs" className={className}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Play /> Ver técnica
        </a>
      </Button>
    )
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="xs" className={className} aria-label={`Ver la técnica de ${nombre}`}>
          <Play /> Ver técnica
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{nombre}</DialogTitle>
          <DialogDescription>Video de técnica.</DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={embed}
            title={`Técnica: ${nombre}`}
            className="size-full"
            loading="lazy"
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground underline underline-offset-4">
          Abrir en una pestaña nueva
        </a>
      </DialogContent>
    </Dialog>
  )
}
