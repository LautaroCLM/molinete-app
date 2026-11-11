"use client"

import { useState, useTransition } from "react"
import { MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { registrarGimnasio } from "@/lib/actions"
import { registroSchema } from "@/lib/schemas"

export function RegistroForm() {
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const [revisarEmail, setRevisarEmail] = useState(false)
  const [pendiente, start] = useTransition()

  if (revisarEmail)
    return (
      <div className="mt-8 flex items-start gap-3 rounded-lg bg-ok-soft p-4 text-sm text-ok">
        <MailCheck className="mt-0.5 size-5 shrink-0" />
        <p>Te mandamos un email para confirmar tu cuenta. Abrilo y vas a entrar directo a tu gimnasio.</p>
      </div>
    )

  return (
    <form
      method="post"
      noValidate
      className="mt-8 flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const datos = Object.fromEntries(new FormData(e.currentTarget))
        const r = registroSchema.safeParse(datos)
        if (!r.success) return setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
        setErrores({})
        start(async () => {
          const res = await registrarGimnasio(r.data)
          if (!res) return
          if (!res.ok) setError(res.error)
          else setRevisarEmail(true)
        })
      }}
    >
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <Field label="Nombre del gimnasio" htmlFor="nombreGym" error={errores.nombreGym}>
        <Input id="nombreGym" name="nombreGym" className="h-11" autoFocus placeholder="Ej.: Fuerza Sur" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tu nombre" htmlFor="nombre" error={errores.nombre}>
          <Input id="nombre" name="nombre" className="h-11" autoComplete="given-name" />
        </Field>
        <Field label="Apellido" htmlFor="apellido" error={errores.apellido}>
          <Input id="apellido" name="apellido" className="h-11" autoComplete="family-name" />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" error={errores.email}>
        <Input id="email" name="email" type="email" className="h-11" autoComplete="email" />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={errores.password} hint="Al menos 8 caracteres.">
        <Input id="password" name="password" type="password" className="h-11" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" disabled={pendiente} className="mt-2">
        {pendiente ? "Creando tu gimnasio…" : "Crear cuenta"}
      </Button>
    </form>
  )
}
