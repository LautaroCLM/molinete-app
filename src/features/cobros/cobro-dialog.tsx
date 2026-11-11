"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, CalendarCheck, TriangleAlert } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, PrefijoPesos } from "@/components/shared/field"
import { EstadoBadge } from "@/components/shared/estado-badge"
import { usePanel } from "@/components/layout/panel-context"
import { SocioPicker } from "@/features/socios/socio-picker"
import { MedioPagoSelector } from "@/features/caja/medio-pago-selector"
import { calcularNuevoVencimiento } from "@/lib/domain/cuota"
import { registrarCobro } from "@/lib/actions"
import { cobroSchema } from "@/lib/schemas"
import { dni, fecha, pesos } from "@/lib/format"
import { MEDIOS_PAGO } from "@/lib/labels"
import type { SocioIndice } from "@/lib/data"
import type { MedioPago } from "@/types/domain"

export function CobroDialog() {
  const { accion, cerrar, socios } = usePanel()
  const abierto = accion?.tipo === "cobro"
  const socioId = accion?.tipo === "cobro" ? accion.socioId : undefined

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="px-6 pt-5 pb-4">
          <DialogTitle className="font-display text-2xl font-semibold">Cobrar cuota o clase</DialogTitle>
          <DialogDescription>El cobro se suma automáticamente a tu caja.</DialogDescription>
        </DialogHeader>
        {abierto && <Contenido key={socioId ?? "buscar"} inicial={socios.find((s) => s.id === socioId) ?? null} />}
      </DialogContent>
    </Dialog>
  )
}

function Contenido({ inicial }: { inicial: SocioIndice | null }) {
  const [socio, setSocio] = useState<SocioIndice | null>(inicial)
  const { planes } = usePanel()
  if (!planes.some((p) => p.activo))
    return <p className="px-6 pb-6 text-sm text-muted-foreground">No hay planes activos. El dueño tiene que crear uno en Configuración.</p>
  return (
    <div className="px-6 pb-6">
      {socio ? (
        <FormCobro key={socio.id} socio={socio} volver={() => setSocio(null)} />
      ) : (
        <SocioPicker onElegir={setSocio} ayuda="Buscá a quién le vas a cobrar." />
      )}
    </div>
  )
}

function FormCobro({ socio, volver }: { socio: SocioIndice; volver: () => void }) {
  const { planes, gym, cerrar, cajaAbierta } = usePanel()
  const activos = planes.filter((p) => p.activo)
  const planInicial = activos.find((p) => p.id === socio.planId) ?? activos[0]
  const [planId, setPlanId] = useState(planInicial?.id ?? "")
  const plan = planes.find((p) => p.id === planId)!
  const [monto, setMonto] = useState(String(plan.precio))
  const [medio, setMedio] = useState<MedioPago | undefined>()
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [pendiente, start] = useTransition()

  const vence = useMemo(
    () => calcularNuevoVencimiento(plan, gym.config, socio.vencimiento),
    [plan, gym.config, socio.vencimiento],
  )

  function cambiarPlan(id: string) {
    setPlanId(id)
    setMonto(String(planes.find((p) => p.id === id)!.precio))
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const datos = { socioId: socio.id, planId, monto, medio }
    const r = cobroSchema.safeParse(datos)
    if (!r.success) {
      setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
      return
    }
    setErrores({})
    start(async () => {
      const res = await registrarCobro(datos)
      if (!res.ok) return void toast.error(res.error)
      toast.success(`Cobro registrado: ${pesos(r.data.monto)} en ${MEDIOS_PAGO[r.data.medio]}`, {
        description: res.data?.vencimientoHasta
          ? `${socio.nombre} queda al día hasta el ${fecha(res.data.vencimientoHasta)}.`
          : "Se sumó a tu caja.",
      })
      cerrar()
    })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {socio.nombre} {socio.apellido}
          </p>
          <p className="text-xs text-muted-foreground">DNI {dni(socio.dni)}</p>
        </div>
        <EstadoBadge estado={socio.estado}>{socio.resumen}</EstadoBadge>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Qué cobra" htmlFor="cobro-plan" error={errores.planId}>
          <Select value={planId} onValueChange={cambiarPlan}>
            <SelectTrigger id="cobro-plan" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre} · {pesos(p.precio)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Monto" htmlFor="cobro-monto" error={errores.monto}>
          <PrefijoPesos>
            <Input
              id="cobro-monto"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))}
              className="text-right font-semibold tabular-nums"
            />
          </PrefijoPesos>
        </Field>
      </div>

      <Field label="Medio de pago" id="cobro-medio" error={errores.medio}>
        <MedioPagoSelector id="cobro-medio" value={medio} onChange={setMedio} />
      </Field>

      {vence ? (
        <p className="flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2.5 text-sm text-ok">
          <CalendarCheck className="size-4 shrink-0" />
          <span>
            Queda al día hasta el <strong>{fecha(vence)}</strong>
            {gym.config.vencimiento.tipo === "dias_desde_pago"
              ? ` (${gym.config.vencimiento.dias} días${socio.vencimiento && new Date(socio.vencimiento) > new Date() ? " desde su vencimiento actual" : ""}).`
              : ` (día ${gym.config.vencimiento.dia} de cada mes).`}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {plan.tipo === "paquete"
            ? `Suma ${plan.cantidadClases} clases para usar cuando quiera.`
            : "Pago de una clase. No genera vencimiento."}
        </p>
      )}

      {!cajaAbierta && (
        <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2.5 text-sm text-warn">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            No tenés una caja abierta. <Link href="/caja" className="font-semibold underline" onClick={cerrar}>Abrí la caja</Link> antes de cobrar.
          </span>
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Cambiar socio
        </button>
        <Button type="submit" size="lg" disabled={pendiente} className="min-w-48">
          Cobrar {monto ? pesos(Number(monto)) : ""}
        </Button>
      </div>
    </form>
  )
}
