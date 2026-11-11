"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/shared/page-header"
import { Field } from "@/components/shared/field"
import { guardarGimnasio } from "@/lib/actions"
import type { Gym } from "@/types/domain"

export function GimnasioForm({ gym }: { gym: Gym }) {
  const [d, setD] = useState({
    nombre: gym.nombre,
    direccion: gym.direccion,
    localidad: gym.localidad,
    telefono: gym.telefono,
    email: gym.email,
  })
  const [pendiente, start] = useTransition()
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value }))

  return (
    <Panel titulo="Datos del gimnasio">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await guardarGimnasio(d)
            if (r.ok) toast.success("Datos del gimnasio guardados.")
            else toast.error(r.error)
          })
        }}
      >
        <Field label="Nombre" htmlFor="g-nombre">
          <Input id="g-nombre" value={d.nombre} onChange={set("nombre")} />
        </Field>
        <Field label="Teléfono" htmlFor="g-tel">
          <Input id="g-tel" value={d.telefono} onChange={set("telefono")} />
        </Field>
        <Field label="Dirección" htmlFor="g-dir">
          <Input id="g-dir" value={d.direccion} onChange={set("direccion")} />
        </Field>
        <Field label="Localidad" htmlFor="g-loc">
          <Input id="g-loc" value={d.localidad} onChange={set("localidad")} />
        </Field>
        <Field label="Email de contacto" htmlFor="g-email" className="sm:col-span-2">
          <Input id="g-email" type="email" value={d.email} onChange={set("email")} />
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={pendiente}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Panel>
  )
}
