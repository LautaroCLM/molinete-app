"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { iniciarSesion } from "@/lib/actions"

export function LoginForm({ volver, aviso }: { volver: string; aviso?: string }) {
  const [ver, setVer] = useState(false)
  const [error, setError] = useState<string | undefined>(aviso)
  const [pendiente, start] = useTransition()

  return (
    <form
      method="post"
      className="mt-8 flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        start(async () => {
          const r = await iniciarSesion({ email: f.get("email"), password: f.get("password") }, volver)
          if (r && !r.ok) setError(r.error)
        })
      }}
    >
      {error && (
        <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@gimnasio.com" className="h-11" autoFocus required />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <div className="relative">
          <Input id="password" name="password" type={ver ? "text" : "password"} autoComplete="current-password" className="h-11 pr-11" required />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
          >
            {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar" className="text-sm font-medium text-primary hover:underline">
          Olvidé mi contraseña
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={pendiente} className="mt-2">
        {pendiente ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  )
}
