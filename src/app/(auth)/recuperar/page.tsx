"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { recuperarContrasena } from "@/lib/actions"
import { AuthLayout } from "../auth-layout"

export default function RecuperarPage() {
  const [enviado, setEnviado] = useState(false)
  const [pendiente, start] = useTransition()

  return (
    <AuthLayout titulo="Recuperá tu contraseña" bajada="Te mandamos un enlace para elegir una nueva.">
      {enviado ? (
        <div className="mt-8 flex items-start gap-3 rounded-lg bg-ok-soft p-4 text-sm text-ok">
          <MailCheck className="mt-0.5 size-5 shrink-0" />
          <p>Si el email está registrado, en unos minutos te llega el enlace. Revisá también el correo no deseado.</p>
        </div>
      ) : (
        <form
          method="post"
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const email = String(new FormData(e.currentTarget).get("email") ?? "")
            start(async () => {
              await recuperarContrasena(email)
              setEnviado(true)
            })
          }}
        >
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoFocus className="h-11" autoComplete="email" />
          </Field>
          <Button type="submit" size="lg" disabled={pendiente}>
            Enviar enlace
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver al ingreso
        </Link>
      </p>
    </AuthLayout>
  )
}
