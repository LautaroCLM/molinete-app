"use client"

import { useState } from "react"
import { BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SocioAvatar } from "@/components/shared/socio-avatar"
import { cn } from "@/lib/utils"
import { BotonAvisar } from "./boton-avisar"
import { useAvisar, type SocioAviso } from "./use-avisar"

export interface SocioParaAvisar extends SocioAviso {
  apellido: string
  resumen: string
}

/** Lista de cuotas por vencer y vencidas para avisar por WhatsApp una por una (cada aviso queda registrado). */
export function AvisosCuotas({ socios, ultimos }: { socios: SocioParaAvisar[]; ultimos: Record<string, string> }) {
  const { aplica } = useAvisar()
  const [tab, setTab] = useState<"por_vencer" | "vencida">("por_vencer")
  const candidatos = socios.flatMap((s) => {
    const a = aplica(s)
    return a ? [{ s, tipo: a.tipo }] : []
  })
  if (candidatos.length === 0) return null

  const porTipo = (t: "por_vencer" | "vencida") =>
    candidatos
      .filter((c) => c.tipo === t)
      .sort((a, b) => (a.s.dias ?? 0) - (b.s.dias ?? 0))
      .map((c) => c.s)
  const lista = { por_vencer: porTipo("por_vencer"), vencida: porTipo("vencida") }
  const sinAvisar = (l: SocioParaAvisar[]) => l.filter((s) => !ultimos[s.id]).length

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <BellRing /> Avisar cuotas
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Avisar cuotas por WhatsApp</DialogTitle>
          <DialogDescription>Cada botón abre WhatsApp con el mensaje escrito; vos solo apretás enviar. Queda registrado a quién ya se le avisó.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2" role="tablist" aria-label="Tipo de aviso">
          {(
            [
              ["por_vencer", "Por vencer"],
              ["vencida", "Vencidas"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", tab === id ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {etiqueta} ({lista[id].length})
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{sinAvisar(lista[tab]) === 0 ? "A todos ya se les avisó." : `${sinAvisar(lista[tab])} sin avisar en los últimos 45 días.`}</p>

        <ul className="-mx-1 min-h-0 flex-1 divide-y overflow-y-auto px-1">
          {lista[tab].length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">Nadie por acá.</li>
          ) : (
            lista[tab].map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <SocioAvatar id={s.id} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {s.apellido}, {s.nombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.resumen}</p>
                </div>
                <BotonAvisar socio={s} ultimoAviso={ultimos[s.id]} />
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
