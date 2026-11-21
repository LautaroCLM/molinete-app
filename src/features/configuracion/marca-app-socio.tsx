"use client"

import { useState, useTransition } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { guardarMarca } from "@/lib/actions"
import { COLOR_RE, COLORES_SUGERIDOS, textoSobre } from "@/lib/color"
import { cn } from "@/lib/utils"
import type { Gym } from "@/types/domain"

/** Color y frase de bienvenida de la app que ven los socios (el logo se carga arriba). */
export function MarcaAppSocio({ gym }: { gym: Gym }) {
  const [color, setColor] = useState(gym.colorAcento ?? "")
  const [bienvenida, setBienvenida] = useState(gym.msgBienvenida ?? "")
  const [pendiente, start] = useTransition()
  const valido = COLOR_RE.test(color)

  return (
    <Panel titulo="App del socio" descripcion="Cómo ven tu gimnasio los socios en su celular: color principal y una frase de bienvenida. El logo es el de arriba.">
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await guardarMarca({ colorAcento: color, msgBienvenida: bienvenida })
            if (r.ok) toast.success("Guardado. Los socios lo ven al abrir la app.")
            else toast.error(r.error)
          })
        }}
      >
        <Field label="Color principal" htmlFor="marca-color">
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Colores sugeridos" className="flex flex-wrap items-center gap-2">
              {COLORES_SUGERIDOS.map((c) => {
                const elegido = color.toLowerCase() === c.hex
                return (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.nombre}
                    aria-pressed={elegido}
                    onClick={() => setColor(c.hex)}
                    className={cn(
                      "grid size-10 place-items-center rounded-full border-2 border-transparent ring-1 ring-foreground/20 outline-offset-2 transition-transform active:scale-95",
                      elegido && "border-background ring-2 ring-foreground",
                    )}
                    style={{ background: c.hex, color: textoSobre(c.hex) }}
                  >
                    {elegido && <Check aria-hidden className="size-5" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
            <input
              id="marca-color"
              type="color"
              value={valido ? color : "#15803d"}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Elegir otro color"
              className="h-10 w-14 cursor-pointer rounded-md border bg-transparent p-0.5"
            />
            {color && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setColor("")}>
                Usar el de Molinete
              </Button>
            )}
          </div>
        </Field>

        <Field label="Frase de bienvenida" htmlFor="marca-bienvenida">
          <Input id="marca-bienvenida" value={bienvenida} onChange={(e) => setBienvenida(e.target.value)} maxLength={140} placeholder="Ej.: ¡Dale que hoy se entrena! Te esperamos de 7 a 22." />
          <p className="mt-1 text-xs text-muted-foreground">{bienvenida.length}/140. Vacío = “¡Buen entrenamiento!”.</p>
        </Field>

        <div className="rounded-xl border bg-muted/40 p-4">
          <p className="text-xs font-medium text-muted-foreground">Vista previa en el celular del socio</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex h-11 items-center rounded-lg px-5 text-sm font-semibold" style={valido ? { background: color, color: textoSobre(color) } : undefined}>
              Ver mi perfil
            </span>
            <p className="min-w-0 text-sm text-muted-foreground">{bienvenida.trim() || "¡Buen entrenamiento!"}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pendiente || (color !== "" && !valido)}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Panel>
  )
}
