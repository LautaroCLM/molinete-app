"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { definirContrasena } from "@/lib/actions"
import { AuthLayout } from "../auth-layout"

/** Llegan acá desde el email de invitación o de recuperación (ya con sesión iniciada). */
export default function BienvenidaPage() {
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()

  return (
    <AuthLayout titulo="Elegí tu contraseña" bajada="La vas a usar para entrar a Molinete con tu email.">
      <form
        method="post"
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          if (f.get("password") !== f.get("repetir")) return setError("Las contraseñas no coinciden.")
          start(async () => {
            const r = await definirContrasena({ password: f.get("password") })
            if (r && !r.ok) setError(r.error)
          })
        }}
      >
        {error && (
          <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
            {error}
          </p>
        )}
        <Field label="Contraseña nueva" htmlFor="password" hint="Al menos 8 caracteres.">
          <Input id="password" name="password" type="password" autoComplete="new-password" className="h-11" autoFocus required />
        </Field>
        <Field label="Repetila" htmlFor="repetir">
          <Input id="repetir" name="repetir" type="password" autoComplete="new-password" className="h-11" required />
        </Field>
        <Button type="submit" size="lg" disabled={pendiente}>
          Guardar y entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
