"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Check, Copy, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { crearGimnasioAdmin } from "@/lib/actions/admin"
import { altaGimnasioSchema } from "@/lib/schemas"
import { CredencialCampos, credencialVacia, generarContrasena, type Credencial } from "../credencial-campos"

const gymVacio = { nombre: "", direccion: "", localidad: "", telefono: "", email: "" }

export function AltaForm() {
  const [gym, setGym] = useState(gymVacio)
  const [dueno, setDueno] = useState<Credencial>({ ...credencialVacia(), password: generarContrasena() })
  const [empleados, setEmpleados] = useState<Credencial[]>([])
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()
  const [listo, setListo] = useState<{ id: string; texto: string } | null>(null)

  const setG = (k: keyof typeof gymVacio) => (e: React.ChangeEvent<HTMLInputElement>) => setGym((g) => ({ ...g, [k]: e.target.value }))

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const datos = { gimnasio: gym, dueno, empleados }
    const r = altaGimnasioSchema.safeParse(datos)
    if (!r.success) return setError(r.error.issues[0]?.message)
    setError(undefined)
    start(async () => {
      const res = await crearGimnasioAdmin(datos)
      if (!res.ok) return setError(res.error)
      const filas = [dueno, ...empleados].map((c, i) => `${i === 0 ? "Dueño" : "Empleado"}: ${c.email} / ${c.password}`)
      setListo({
        id: res.data?.id ?? "",
        texto: [`Gimnasio: ${gym.nombre}`, `Ingresar en: ${window.location.origin}/login`, ...filas].join("\n"),
      })
    })
  }

  if (listo)
    return (
      <Panel titulo="Gimnasio creado" descripcion="Copiá estos datos y pasáselos al dueño. Las contraseñas no se pueden volver a ver (sí se pueden restablecer).">
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-relaxed">{listo.texto}</pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(listo.texto)
                toast.success("Datos copiados.")
              } catch {
                toast.error("No se pudo copiar. Seleccionalos a mano.")
              }
            }}
          >
            <Copy /> Copiar datos
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/${listo.id}`}>
              <Check /> Ver el gimnasio
            </Link>
          </Button>
        </div>
      </Panel>
    )

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      <Panel titulo="Datos del gimnasio" descripcion="Después el dueño puede editarlos desde Configuración.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del gimnasio" htmlFor="g-nombre" className="sm:col-span-2">
            <Input id="g-nombre" value={gym.nombre} onChange={setG("nombre")} autoFocus autoComplete="off" />
          </Field>
          <Field label="Dirección" htmlFor="g-dir">
            <Input id="g-dir" value={gym.direccion} onChange={setG("direccion")} autoComplete="off" />
          </Field>
          <Field label="Localidad" htmlFor="g-loc">
            <Input id="g-loc" value={gym.localidad} onChange={setG("localidad")} autoComplete="off" />
          </Field>
          <Field label="Teléfono" htmlFor="g-tel">
            <Input id="g-tel" value={gym.telefono} onChange={setG("telefono")} autoComplete="off" />
          </Field>
          <Field label="Email de contacto" htmlFor="g-email" hint="Opcional. Si lo dejás vacío se usa el del dueño.">
            <Input id="g-email" type="email" value={gym.email} onChange={setG("email")} autoComplete="off" />
          </Field>
        </div>
      </Panel>

      <Panel titulo="Dueño" descripcion="Ve y hace todo: reportes, caja, configuración.">
        <CredencialCampos valor={dueno} onChange={setDueno} prefijo="dueno" />
      </Panel>

      <Panel
        titulo="Empleados"
        descripcion="Recepción: socios, cobros, asistencias y ventas. No ven reportes ni totales. Podés sumar más después."
        accion={
          <Button type="button" variant="outline" size="sm" onClick={() => setEmpleados((l) => [...l, { ...credencialVacia(), password: generarContrasena() }])}>
            <Plus /> Agregar empleado
          </Button>
        }
      >
        {empleados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin empleados por ahora.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {empleados.map((emp, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Empleado {i + 1}</p>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar empleado ${i + 1}`} onClick={() => setEmpleados((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
                <CredencialCampos valor={emp} onChange={(v) => setEmpleados((l) => l.map((x, j) => (j === i ? v : x)))} prefijo={`emp${i}`} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href="/admin">Cancelar</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pendiente}>
          {pendiente ? "Creando…" : "Crear gimnasio"}
        </Button>
      </div>
    </form>
  )
}
