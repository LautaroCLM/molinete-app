"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Lock, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, PrefijoPesos } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { MedioPagoSelector } from "./medio-pago-selector"
import { abrirCaja, cerrarCaja, registrarMovimiento } from "@/lib/actions"
import { aperturaCajaSchema, movimientoSchema } from "@/lib/schemas"
import { CATEGORIAS_MOVIMIENTO } from "@/lib/labels"
import { pesos } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CategoriaMovimiento, MedioPago } from "@/types/domain"

const soloNumeros = (v: string) => v.replace(/\D/g, "")

export function AbrirCajaForm({ sugerido }: { sugerido: number }) {
  const [monto, setMonto] = useState(String(sugerido))
  const [obs, setObs] = useState("")
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()

  return (
    <Panel className="mx-auto w-full max-w-lg" titulo="Abrir caja" descripcion="Contá el efectivo que hay en la caja antes de empezar el turno.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const r = aperturaCajaSchema.safeParse({ montoInicial: monto, observaciones: obs })
          if (!r.success) return setError(r.error.issues[0].message)
          setError(undefined)
          start(async () => {
            const res = await abrirCaja(r.data)
            if (res.ok) toast.success(`Caja abierta con ${pesos(r.data.montoInicial)} en efectivo.`)
            else toast.error(res.error)
          })
        }}
      >
        <Field label="Efectivo inicial" htmlFor="inicial" error={error} hint={`El turno anterior dejó ${pesos(sugerido)}.`}>
          <PrefijoPesos>
            <Input
              id="inicial"
              inputMode="numeric"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(soloNumeros(e.target.value))}
              className="h-12 text-right text-lg font-semibold tabular-nums"
            />
          </PrefijoPesos>
        </Field>
        <Field label="Observaciones" htmlFor="obs-apertura" hint="Opcional.">
          <Textarea id="obs-apertura" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" disabled={pendiente}>
          Abrir caja
        </Button>
      </form>
    </Panel>
  )
}

export function CerrarCajaBoton({ cajaId, esperado, inicial }: { cajaId: string; esperado: number; inicial: number }) {
  const [abierto, setAbierto] = useState(false)
  const [contado, setContado] = useState("")
  const [obs, setObs] = useState("")
  const [pendiente, start] = useTransition()
  const n = contado === "" ? null : Number(contado)
  const diferencia = n === null ? null : n - esperado

  return (
    <>
      <Button size="lg" variant="outline" onClick={() => setAbierto(true)}>
        <Lock /> Cerrar caja
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold">Cerrar caja</DialogTitle>
            <DialogDescription>Contá el efectivo de la caja y anotá cuánto hay. Las transferencias y pagos con tarjeta no se cuentan.</DialogDescription>
          </DialogHeader>
          <form
            id="form-cierre"
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (n === null) return void toast.error("Ingresá el efectivo contado.")
              start(async () => {
                const r = await cerrarCaja({ cajaId, montoContado: n, observaciones: obs })
                if (!r.ok) return void toast.error(r.error)
                toast.success("Caja cerrada.", {
                  description: r.data?.diferencia === 0 ? "Coincide con lo esperado." : `Diferencia: ${pesos(r.data?.diferencia ?? 0)}`,
                })
                setAbierto(false)
              })
            }}
          >
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-sm">
              <div className="bg-card p-3">
                <dt className="text-muted-foreground">Efectivo inicial</dt>
                <dd className="font-semibold tabular-nums">{pesos(inicial)}</dd>
              </div>
              <div className="bg-card p-3">
                <dt className="text-muted-foreground">Efectivo esperado</dt>
                <dd className="font-semibold tabular-nums">{pesos(esperado)}</dd>
              </div>
            </dl>
            <Field label="Efectivo contado" htmlFor="contado">
              <PrefijoPesos>
                <Input
                  id="contado"
                  inputMode="numeric"
                  autoFocus
                  value={contado}
                  onChange={(e) => setContado(soloNumeros(e.target.value))}
                  className="h-12 text-right text-lg font-semibold tabular-nums"
                />
              </PrefijoPesos>
            </Field>
            {diferencia !== null && (
              <p
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  diferencia === 0 ? "bg-ok-soft text-ok" : diferencia < 0 ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn",
                )}
              >
                {diferencia === 0
                  ? "Coincide con lo esperado."
                  : diferencia < 0
                    ? `Faltan ${pesos(-diferencia)}.`
                    : `Sobran ${pesos(diferencia)}.`}
              </p>
            )}
            <Field label="Observaciones" htmlFor="obs-cierre" hint={diferencia ? "Contá qué pudo haber pasado con la diferencia." : "Opcional."}>
              <Textarea id="obs-cierre" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-cierre" disabled={pendiente}>
              Cerrar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function MovimientoBoton({ tipo, sinCaja = false }: { tipo: "ingreso" | "egreso"; sinCaja?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const categorias = (Object.entries(CATEGORIAS_MOVIMIENTO) as [CategoriaMovimiento, { label: string; tipo: string }][]).filter(
    ([k, c]) => c.tipo === tipo && !["cuota", "clase", "venta_producto"].includes(k),
  )
  const [categoria, setCategoria] = useState<string>(categorias[0][0])
  const [monto, setMonto] = useState("")
  const [medio, setMedio] = useState<MedioPago | undefined>(sinCaja ? "transferencia" : "efectivo")
  const [descripcion, setDescripcion] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [pendiente, start] = useTransition()

  return (
    <>
      <Button size="lg" variant="outline" onClick={() => setAbierto(true)}>
        {tipo === "ingreso" ? <Plus /> : <Minus />}
        {sinCaja ? "Gasto de administración" : tipo === "ingreso" ? "Otro ingreso" : "Registrar gasto"}
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold">{tipo === "ingreso" ? "Registrar ingreso" : "Registrar gasto"}</DialogTitle>
            <DialogDescription>
              {sinCaja
                ? "Alquiler, sueldos, servicios o compras que no salen de una caja de turno."
                : tipo === "ingreso"
                  ? "Para ingresos que no son cuotas, clases ni ventas."
                  : "Sale de tu caja. Queda registrado quién lo cargó."}
            </DialogDescription>
          </DialogHeader>
          <form
            id={`form-mov-${tipo}`}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const datos = { tipo, categoria, monto, medio, descripcion, sinCaja }
              const r = movimientoSchema.safeParse(datos)
              if (!r.success) return setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
              setErrores({})
              start(async () => {
                const res = await registrarMovimiento(datos)
                if (!res.ok) return void toast.error(res.error)
                toast.success(`${tipo === "ingreso" ? "Ingreso" : "Gasto"} registrado: ${pesos(r.data.monto)}`)
                setAbierto(false)
                setMonto("")
                setDescripcion("")
              })
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoría" htmlFor="mov-cat">
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger id="mov-cat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(([k, c]) => (
                      <SelectItem key={k} value={k}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Monto" htmlFor="mov-monto" error={errores.monto}>
                <PrefijoPesos>
                  <Input id="mov-monto" inputMode="numeric" value={monto} onChange={(e) => setMonto(soloNumeros(e.target.value))} className="text-right font-semibold tabular-nums" />
                </PrefijoPesos>
              </Field>
            </div>
            <Field label="Descripción" htmlFor="mov-desc" error={errores.descripcion}>
              <Input id="mov-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={tipo === "egreso" ? "Ej.: Artículos de limpieza" : "Ej.: Alquiler de sala para evento"} />
            </Field>
            <Field label="Medio de pago" id="mov-medio" error={errores.medio}>
              <MedioPagoSelector id="mov-medio" value={medio} onChange={setMedio} />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={`form-mov-${tipo}`} disabled={pendiente}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
