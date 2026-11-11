"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { guardarSocio } from "@/lib/actions"
import { socioSchema, type SocioInput } from "@/lib/schemas"
import { pesos } from "@/lib/format"
import { TIPOS_PLAN } from "@/lib/labels"
import type { Plan, Socio } from "@/types/domain"

export function SocioForm({ planes, socio }: { planes: Plan[]; socio?: Socio }) {
  const router = useRouter()
  const [pendiente, start] = useTransition()
  const [errores, setErrores] = useState<Partial<Record<keyof SocioInput, string>>>({})
  const [datos, setDatos] = useState<SocioInput>({
    nombre: socio?.nombre ?? "",
    apellido: socio?.apellido ?? "",
    dni: socio?.dni ?? "",
    telefono: socio?.telefono ?? "",
    email: socio?.email ?? "",
    fechaAlta: format(socio ? new Date(socio.fechaAlta) : new Date(), "yyyy-MM-dd"),
    planId: socio?.planId ?? planes.find((p) => p.activo)?.id ?? "",
    observaciones: socio?.observaciones ?? "",
  })
  const set = (k: keyof SocioInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDatos((d) => ({ ...d, [k]: e.target.value }))
  const plan = planes.find((p) => p.id === datos.planId)

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const r = socioSchema.safeParse(datos)
    if (!r.success) {
      setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
      return
    }
    setErrores({})
    start(async () => {
      const res = await guardarSocio(datos, socio?.id)
      if (!res.ok) return void toast.error(res.error)
      toast.success(socio ? "Cambios guardados." : `${r.data.nombre} ${r.data.apellido} ya es socio.`, {
        description: socio ? undefined : "Ahora cobrale la primera cuota.",
      })
      router.push(socio ? `/clientes/${socio.id}` : `/clientes/${res.data?.id}?cobrar=1`)
    })
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        <Panel titulo="Datos personales">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="nombre" error={errores.nombre}>
              <Input id="nombre" value={datos.nombre} onChange={set("nombre")} autoFocus autoComplete="off" />
            </Field>
            <Field label="Apellido" htmlFor="apellido" error={errores.apellido}>
              <Input id="apellido" value={datos.apellido} onChange={set("apellido")} autoComplete="off" />
            </Field>
            <Field label="DNI" htmlFor="dni" error={errores.dni} hint="Sin puntos. Se usa para buscarlo y para el ingreso con QR.">
              <Input id="dni" inputMode="numeric" value={datos.dni} onChange={set("dni")} className="tabular-nums" />
            </Field>
            <Field label="Fecha de alta" htmlFor="fechaAlta" error={errores.fechaAlta}>
              <Input id="fechaAlta" type="date" value={datos.fechaAlta} onChange={set("fechaAlta")} />
            </Field>
          </div>
        </Panel>
        <Panel titulo="Contacto">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono" htmlFor="telefono" hint="Opcional. Con código de área.">
              <Input id="telefono" type="tel" value={datos.telefono} onChange={set("telefono")} placeholder="11 5555-1234" />
            </Field>
            <Field label="Email" htmlFor="email" error={errores.email} hint="Opcional.">
              <Input id="email" type="email" value={datos.email} onChange={set("email")} placeholder="nombre@gmail.com" />
            </Field>
            <Field label="Observaciones" htmlFor="obs" className="sm:col-span-2" hint="Lesiones, apto médico, preferencias. Lo ve todo el equipo.">
              <Textarea id="obs" rows={3} value={datos.observaciones} onChange={set("observaciones")} />
            </Field>
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        <Panel titulo="Plan">
          <Field label="Cómo paga" htmlFor="plan" error={errores.planId}>
            <Select value={datos.planId} onValueChange={(v) => setDatos((d) => ({ ...d, planId: v }))}>
              <SelectTrigger id="plan" className="w-full">
                <SelectValue placeholder="Elegí un plan" />
              </SelectTrigger>
              <SelectContent>
                {planes
                  .filter((p) => p.activo)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          {plan && (
            <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
              <p className="flex justify-between font-semibold">
                <span>{TIPOS_PLAN[plan.tipo].label}</span>
                <span className="tabular-nums">{pesos(plan.precio)}</span>
              </p>
              <p className="mt-1 text-muted-foreground">{TIPOS_PLAN[plan.tipo].descripcion}</p>
            </div>
          )}
        </Panel>
        <div className="flex flex-col gap-2 lg:sticky lg:top-24">
          <Button type="submit" size="lg" disabled={pendiente}>
            {socio ? "Guardar cambios" : "Dar de alta"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  )
}
