"use client"

import { Dices } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"

export interface Credencial {
  nombre: string
  apellido: string
  email: string
  password: string
}

export const credencialVacia = (): Credencial => ({ nombre: "", apellido: "", email: "", password: "" })

/** Contraseña legible de 12 caracteres, sin letras que se confunden (0/O, 1/l/I). */
export function generarContrasena() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(bytes, (b) => letras[b % letras.length]).join("")
}

export function CredencialCampos({
  valor,
  onChange,
  prefijo,
  errores = {},
}: {
  valor: Credencial
  onChange: (v: Credencial) => void
  prefijo: string
  errores?: Partial<Record<keyof Credencial, string>>
}) {
  const set = (k: keyof Credencial) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...valor, [k]: e.target.value })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre" htmlFor={`${prefijo}-nombre`} error={errores.nombre}>
        <Input id={`${prefijo}-nombre`} value={valor.nombre} onChange={set("nombre")} autoComplete="off" />
      </Field>
      <Field label="Apellido" htmlFor={`${prefijo}-apellido`}>
        <Input id={`${prefijo}-apellido`} value={valor.apellido} onChange={set("apellido")} autoComplete="off" />
      </Field>
      <Field label="Email (es su usuario)" htmlFor={`${prefijo}-email`} error={errores.email}>
        <Input id={`${prefijo}-email`} type="email" value={valor.email} onChange={set("email")} autoComplete="off" />
      </Field>
      <Field label="Contraseña" htmlFor={`${prefijo}-pass`} error={errores.password} hint="Mínimo 8 caracteres. Anotala: después no se puede ver.">
        <div className="flex gap-2">
          <Input id={`${prefijo}-pass`} value={valor.password} onChange={set("password")} autoComplete="off" className="font-mono" />
          <Button type="button" variant="outline" onClick={() => onChange({ ...valor, password: generarContrasena() })}>
            <Dices /> Generar
          </Button>
        </div>
      </Field>
    </div>
  )
}
