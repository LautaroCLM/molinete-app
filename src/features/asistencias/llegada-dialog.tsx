"use client"

import { SocioAvatar } from "@/components/shared/socio-avatar"
import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Check, Banknote, CircleAlert } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ESTILO_ESTADO, Disco } from "@/components/shared/estado-badge"
import { usePanel } from "@/components/layout/panel-context"
import { SocioPicker } from "@/features/socios/socio-picker"
import { registrarAsistencia } from "@/lib/actions"
import { ESTADOS_CUOTA } from "@/lib/labels"
import { dni, fecha, pesos } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SocioIndice } from "@/lib/data"

export function LlegadaDialog() {
  const { accion, cerrar, socios } = usePanel()
  const abierto = accion?.tipo === "llegada"
  const socioId = accion?.tipo === "llegada" ? accion.socioId : undefined

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        {abierto && <Contenido key={socioId ?? "buscar"} inicial={socios.find((s) => s.id === socioId) ?? null} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({ inicial }: { inicial: SocioIndice | null }) {
  const [socio, setSocio] = useState<SocioIndice | null>(inicial)
  const [ultimo, setUltimo] = useState<string | null>(null)

  return (
    <>
      <DialogHeader className="px-6 pt-5 pb-4">
        <DialogTitle className="font-display text-2xl font-semibold">Registrar llegada</DialogTitle>
        <DialogDescription>
          {socio ? "Revisá el estado de la cuota y confirmá." : "Buscá al socio y elegilo con Enter."}
        </DialogDescription>
      </DialogHeader>
      <div className="px-6 pb-6">
        {socio ? (
          <Ficha
            socio={socio}
            volver={() => setSocio(null)}
            registrado={(nombre) => {
              setUltimo(nombre)
              setSocio(null)
            }}
          />
        ) : (
          <>
            {ultimo && (
              <p className="mb-3 flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2 text-sm font-medium text-ok">
                <Check className="size-4" /> Llegada de {ultimo} registrada. Podés seguir con el próximo.
              </p>
            )}
            <SocioPicker onElegir={setSocio} />
          </>
        )}
      </div>
    </>
  )
}

function Ficha({
  socio,
  volver,
  registrado,
}: {
  socio: SocioIndice
  volver: () => void
  registrado: (nombre: string) => void
}) {
  const { abrir } = usePanel()
  const [pendiente, start] = useTransition()
  const e = ESTILO_ESTADO[socio.estado]
  const debe = socio.estado === "vencido" || socio.estado === "en_gracia"
  const porClase = socio.estado === "por_clase"

  function confirmar() {
    start(async () => {
      const r = await registrarAsistencia(socio.id)
      if (!r.ok) return void toast.error(r.error)
      toast.success(`Llegada registrada: ${socio.nombre} ${socio.apellido}`)
      registrado(socio.nombre)
    })
  }

  const cobrar = () => abrir({ tipo: "cobro", socioId: socio.id })

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("relative overflow-hidden rounded-xl p-5", e.fondo)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SocioAvatar id={socio.id} nombre={socio.nombre} apellido={socio.apellido} className="size-12 text-base" />
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold">
                {socio.nombre} {socio.apellido}
              </p>
              <p className="text-sm text-muted-foreground">
                DNI {dni(socio.dni)} · {socio.plan}
              </p>
            </div>
          </div>
          <Disco estado={socio.estado} className="size-9 border-[9px]" />
        </div>
        <p className={cn("num-display mt-5 text-5xl", e.texto)}>{ESTADOS_CUOTA[socio.estado]}</p>
        <p className={cn("mt-1 text-[0.95rem] font-medium", e.texto)}>
          {socio.resumen}
          {socio.vencimiento && !porClase && ` · ${debe ? "venció" : "vence"} el ${fecha(socio.vencimiento)}`}
        </p>
      </div>

      {socio.vinoHoy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlert className="size-4" /> Ya tiene una llegada registrada hoy.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        {porClase ? (
          <>
            <Button size="lg" className="sm:flex-1" onClick={cobrar} autoFocus>
              <Banknote /> Cobrar clase {pesos(socio.precioPlan)}
            </Button>
            <Button size="lg" variant="outline" onClick={confirmar} disabled={pendiente}>
              Registrar sin cobrar
            </Button>
          </>
        ) : debe ? (
          <>
            <Button size="lg" className="sm:flex-1" onClick={cobrar} autoFocus>
              <Banknote /> Cobrar cuota
            </Button>
            <Button size="lg" variant="outline" onClick={confirmar} disabled={pendiente}>
              Registrar igual
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" className="sm:flex-1" onClick={confirmar} disabled={pendiente} autoFocus>
              <Check /> Confirmar llegada
            </Button>
            {socio.estado === "por_vencer" && (
              <Button size="lg" variant="outline" onClick={cobrar}>
                Cobrar ahora
              </Button>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <button onClick={volver} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Buscar otro socio
        </button>
        <Link href={`/clientes/${socio.id}`} className="font-medium text-primary hover:underline">
          Ver ficha
        </Link>
      </div>
    </div>
  )
}
