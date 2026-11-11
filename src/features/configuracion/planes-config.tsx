"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, PrefijoPesos } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { cambiarEstadoPlan, guardarPlan, guardarReglas } from "@/lib/actions"
import { planSchema } from "@/lib/schemas"
import { TIPOS_PLAN } from "@/lib/labels"
import { pesos } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { GymConfig, Plan, TipoPlan } from "@/types/domain"

function detalle(p: Plan) {
  if (p.tipo === "paquete") return `${p.cantidadClases} clases`
  if (p.tipo === "por_clase") return "Sin vencimiento"
  if (p.tipo === "mensual") return "Según regla de vencimiento"
  return `${p.duracionDias} ${p.duracionDias === 1 ? "día" : "días"}`
}

export function PlanesConfig({ planes }: { planes: Plan[] }) {
  const [editando, setEditando] = useState<Plan | "nuevo" | null>(null)

  return (
    <Panel
      titulo="Planes"
      descripcion="Lo que se le puede cobrar a un socio. Un plan desactivado no se ofrece en cobros nuevos, pero quienes ya lo tienen lo conservan."
      accion={
        <Button onClick={() => setEditando("nuevo")}>
          <Plus /> Nuevo plan
        </Button>
      }
      contenidoClassName="px-0 pb-0"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5 text-xs">Plan</TableHead>
            <TableHead className="hidden text-xs sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden text-xs md:table-cell">Duración</TableHead>
            <TableHead className="text-right text-xs">Precio</TableHead>
            <TableHead className="text-xs">Activo</TableHead>
            <TableHead className="pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {planes.map((p) => (
            <TableRow key={p.id} className={cn(!p.activo && "text-muted-foreground")}>
              <TableCell className="pl-5 font-medium">{p.nombre}</TableCell>
              <TableCell className="hidden sm:table-cell">{TIPOS_PLAN[p.tipo].label}</TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{detalle(p)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{pesos(p.precio)}</TableCell>
              <TableCell>
                <Switch
                  checked={p.activo}
                  onCheckedChange={async (v) => {
                    const r = await cambiarEstadoPlan(p.id, v)
                    if (r.ok) toast.success(`${p.nombre} ${v ? "activado" : "desactivado"}.`)
                    else toast.error(r.error)
                  }}
                  aria-label={`Activar ${p.nombre}`}
                />
              </TableCell>
              <TableCell className="pr-5 text-right">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditando(p)} aria-label={`Editar ${p.nombre}`}>
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando && editando !== "nuevo" ? "Editar plan" : "Nuevo plan"}</DialogTitle>
            <DialogDescription>Un cambio de precio aplica a los cobros que se hagan desde ahora.</DialogDescription>
          </DialogHeader>
          {editando && <PlanForm key={editando === "nuevo" ? "n" : editando.id} plan={editando === "nuevo" ? null : editando} cerrar={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </Panel>
  )
}

function PlanForm({ plan, cerrar }: { plan: Plan | null; cerrar: () => void }) {
  const [tipo, setTipo] = useState<TipoPlan>(plan?.tipo ?? "mensual")
  const [nombre, setNombre] = useState(plan?.nombre ?? "")
  const [precio, setPrecio] = useState(String(plan?.precio ?? ""))
  const [duracion, setDuracion] = useState(String(plan?.duracionDias ?? 7))
  const [clases, setClases] = useState(String(plan?.cantidadClases ?? 8))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [pendiente, start] = useTransition()

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const datos = {
          nombre,
          tipo,
          precio,
          duracionDias: tipo === "semanal" ? duracion : tipo === "pase_diario" ? 1 : null,
          cantidadClases: tipo === "paquete" ? clases : null,
        }
        const r = planSchema.safeParse(datos)
        if (!r.success) return setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
        start(async () => {
          const res = await guardarPlan(r.data, plan?.id)
          if (!res.ok) return void toast.error(res.error)
          toast.success(plan ? "Plan actualizado." : `Plan “${r.data.nombre}” creado.`)
          cerrar()
        })
      }}
    >
      <div role="radiogroup" aria-label="Tipo de plan" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(Object.keys(TIPOS_PLAN) as TipoPlan[]).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => setTipo(t)}
            className={cn(
              "rounded-lg border p-3 text-left text-sm transition-colors hover:border-ring/60",
              tipo === t && "border-primary bg-accent ring-1 ring-primary",
            )}
          >
            <span className="block font-semibold">{TIPOS_PLAN[t].label}</span>
            <span className="text-xs text-muted-foreground">{TIPOS_PLAN[t].descripcion}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="plan-nombre" error={errores.nombre} className="sm:col-span-2">
          <Input id="plan-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Mensual libre" />
        </Field>
        <Field label="Precio" htmlFor="plan-precio" error={errores.precio}>
          <PrefijoPesos>
            <Input id="plan-precio" inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))} className="tabular-nums" />
          </PrefijoPesos>
        </Field>
        {tipo === "semanal" && (
          <Field label="Días que cubre" htmlFor="plan-dias">
            <Input id="plan-dias" inputMode="numeric" value={duracion} onChange={(e) => setDuracion(e.target.value.replace(/\D/g, ""))} />
          </Field>
        )}
        {tipo === "paquete" && (
          <Field label="Cantidad de clases" htmlFor="plan-clases">
            <Input id="plan-clases" inputMode="numeric" value={clases} onChange={(e) => setClases(e.target.value.replace(/\D/g, ""))} />
          </Field>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={cerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendiente}>
          {plan ? "Guardar cambios" : "Crear plan"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ReglasVencimiento({ config }: { config: GymConfig }) {
  const [regla, setRegla] = useState(config.vencimiento.tipo)
  const [dias, setDias] = useState(String(config.vencimiento.tipo === "dias_desde_pago" ? config.vencimiento.dias : 30))
  const [dia, setDia] = useState(String(config.vencimiento.tipo === "dia_fijo" ? config.vencimiento.dia : 10))
  const [gracia, setGracia] = useState(String(config.diasGracia))
  const [inactividad, setInactividad] = useState(String(config.diasInactividad))
  const [pendiente, start] = useTransition()

  const ejemplo =
    regla === "dias_desde_pago"
      ? `Si alguien paga el 15 de marzo, queda al día hasta el ${format(addDays(new Date(2026, 2, 15), Number(dias || 0)), "d 'de' MMMM", { locale: es })}.`
      : `Todos vencen el día ${dia} de cada mes, sin importar cuándo pagaron.`

  return (
    <Panel titulo="Reglas de vencimiento" descripcion="Se aplican a los planes mensuales.">
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Cuándo vence la cuota mensual" className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["dias_desde_pago", "A los días del pago", "Cada socio vence en su propia fecha."],
              ["dia_fijo", "Día fijo del mes", "Todos vencen el mismo día."],
            ] as const
          ).map(([id, t, d]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={regla === id}
              onClick={() => setRegla(id)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors hover:border-ring/60",
                regla === id && "border-primary bg-accent ring-1 ring-primary",
              )}
            >
              <span className="block font-semibold">{t}</span>
              <span className="text-xs text-muted-foreground">{d}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {regla === "dias_desde_pago" ? (
            <Field label="Días desde el pago" htmlFor="r-dias">
              <Input id="r-dias" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))} />
            </Field>
          ) : (
            <Field label="Día del mes" htmlFor="r-dia">
              <Select value={dia} onValueChange={setDia}>
                <SelectTrigger id="r-dia" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Días de gracia" htmlFor="r-gracia" hint="Puede seguir entrando aunque haya vencido.">
            <Input id="r-gracia" inputMode="numeric" value={gracia} onChange={(e) => setGracia(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Aviso de inactividad" htmlFor="r-inact" hint="Días sin venir para marcarlo en reportes.">
            <Input id="r-inact" inputMode="numeric" value={inactividad} onChange={(e) => setInactividad(e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>
        <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
          {ejemplo} Después tiene {gracia || 0} días de gracia antes de figurar como vencido.
        </p>
        <div className="flex justify-end">
          <Button
            disabled={pendiente}
            onClick={() =>
              start(async () => {
                const r = await guardarReglas({ vencTipo: regla, vencDias: dias, vencDia: dia, diasGracia: gracia, diasInactividad: inactividad })
                if (r.ok) toast.success("Reglas de vencimiento guardadas.")
                else toast.error(r.error)
              })
            }
          >
            Guardar reglas
          </Button>
        </div>
      </div>
    </Panel>
  )
}
