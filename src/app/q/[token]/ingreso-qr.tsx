"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, Clock, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Disco, ESTILO_ESTADO } from "@/components/shared/estado-badge"
import { LogoMarca } from "@/components/layout/logo"
import { desvincularDispositivo, ingresarConDispositivo, ingresarConDni, type ResultadoQR } from "@/lib/actions/qr"
import { cn } from "@/lib/utils"

type Vista = { tipo: "cargando" } | { tipo: "dni"; error?: string } | { tipo: "listo"; r: Extract<ResultadoQR, { ok: true }> } | { tipo: "error"; mensaje: string }

const clave = (gymId: string) => `molinete:ingreso:${gymId}`

function leer(gymId: string): string | null {
  try {
    return localStorage.getItem(clave(gymId))
  } catch {
    return null
  }
}
function guardar(gymId: string, valor: string | null) {
  try {
    if (valor) localStorage.setItem(clave(gymId), valor)
    else localStorage.removeItem(clave(gymId))
  } catch {
    // Navegador sin almacenamiento (modo privado): se pedirá el DNI cada vez.
  }
}

export function IngresoQR({ token, gymId, gymNombre }: { token: string; gymId: string; gymNombre: string }) {
  const [vista, setVista] = useState<Vista>({ tipo: "cargando" })
  const [pendiente, start] = useTransition()

  function mostrar(r: ResultadoQR) {
    if (r.ok) {
      guardar(gymId, r.dispositivo)
      setVista({ tipo: "listo", r })
    } else if (r.codigo === "DISPOSITIVO_DESCONOCIDO") {
      guardar(gymId, null)
      setVista({ tipo: "dni" })
    } else if (r.codigo === "NO_ENCONTRADO" || r.codigo === "DNI" || r.codigo === "DEMASIADOS_INTENTOS") {
      setVista({ tipo: "dni", error: r.mensaje })
    } else {
      setVista({ tipo: "error", mensaje: r.mensaje })
    }
  }

  useEffect(() => {
    const disp = leer(gymId)
    let vigente = true
    const tarea = disp ? ingresarConDispositivo(token, disp) : Promise.resolve(null)
    tarea.then((r) => {
      if (!vigente) return
      if (r) mostrar(r)
      else setVista({ tipo: "dni" })
    })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, gymId])

  function noSoyYo() {
    const disp = leer(gymId)
    guardar(gymId, null)
    if (disp) void desvincularDispositivo(disp)
    setVista({ tipo: "dni" })
  }

  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center gap-2.5 bg-sidebar px-5 py-4 text-white [--logo-hole:var(--sidebar)]">
        <LogoMarca className="size-6" />
        <span className="truncate font-semibold">{gymNombre}</span>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        {vista.tipo === "cargando" && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground" role="status">
            Registrando tu ingreso…
          </div>
        )}

        {vista.tipo === "dni" && (
          <form
            method="post"
            className="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              const dni = String(new FormData(e.currentTarget).get("dni") ?? "")
              start(async () => mostrar(await ingresarConDni(token, dni)))
            }}
          >
            <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight">Registrá tu ingreso</h1>
            <p className="mt-2 text-muted-foreground">Es solo la primera vez: después este celular te recuerda y alcanza con escanear el QR.</p>
            <label htmlFor="dni" className="mt-8 text-sm font-medium">
              Tu DNI
            </label>
            <Input
              id="dni"
              name="dni"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="Sin puntos"
              className="mt-1.5 h-14 text-center text-2xl font-semibold tracking-widest tabular-nums"
              maxLength={10}
            />
            {vista.error && (
              <p role="alert" className="mt-3 rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
                {vista.error}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-6 h-14 text-lg" disabled={pendiente}>
              {pendiente ? "Registrando…" : "Registrar ingreso"}
            </Button>
            <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
              Solo guardamos en este celular un código para reconocerte. No se registran pagos.
            </p>
          </form>
        )}

        {vista.tipo === "listo" && <Resultado r={vista.r} noSoyYo={noSoyYo} />}

        {vista.tipo === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Info className="size-8 text-muted-foreground" />
            <p className="text-lg font-medium">{vista.mensaje}</p>
          </div>
        )}
      </div>
    </main>
  )
}

function Resultado({ r, noSoyYo }: { r: Extract<ResultadoQR, { ok: true }>; noSoyYo: () => void }) {
  const e = ESTILO_ESTADO[r.estado]
  return (
    <div className="flex flex-1 flex-col">
      <p className={cn("inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-semibold", r.yaRegistrado ? "bg-muted text-muted-foreground" : "bg-ok-soft text-ok")}>
        {r.yaRegistrado ? <Clock className="size-4" /> : <Check className="size-4" />}
        {r.yaRegistrado ? `Ya registraste tu ingreso a las ${r.hora}` : `Ingreso registrado ${r.hora}`}
      </p>

      <h1 className="mt-6 font-display text-5xl leading-none font-semibold tracking-tight">¡Hola, {r.nombre}!</h1>

      <section className={cn("mt-8 rounded-2xl p-6", e.fondo)}>
        <div className="flex items-start justify-between gap-4">
          <p className={cn("num-display text-5xl", e.texto)}>{r.titulo}</p>
          <Disco estado={r.estado} className="size-10 border-[10px]" />
        </div>
        <p className={cn("mt-3 text-lg font-medium", e.texto)}>{r.detalle}</p>
      </section>

      {r.recordatorio && (
        <p className="mt-4 rounded-xl border-2 border-dashed px-4 py-3.5 text-center text-lg font-semibold">{r.recordatorio}</p>
      )}

      <p className="mt-6 text-center text-muted-foreground">¡Buen entrenamiento!</p>

      <button onClick={noSoyYo} className="mt-auto pt-10 text-center text-sm text-muted-foreground underline underline-offset-4">
        No soy {r.nombre}
      </button>
    </div>
  )
}
