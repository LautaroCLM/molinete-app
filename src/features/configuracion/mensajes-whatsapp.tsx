"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { guardarMensajesWhatsApp } from "@/lib/actions"
import { armarMensaje, PLANTILLA_POR_VENCER, PLANTILLA_VENCIDA, VARIABLES_MENSAJE } from "@/lib/whatsapp"
import type { Gym } from "@/types/domain"

const EJEMPLO = { nombre: "Martín", plan: "Mensual", vence: "23/11" }

/** Mensajes de WhatsApp para avisar cuotas. Vacío = texto original. */
export function MensajesWhatsApp({ gym }: { gym: Gym }) {
  const [porVencer, setPorVencer] = useState(gym.msgPorVencer ?? "")
  const [vencida, setVencida] = useState(gym.msgVencida ?? "")
  const [pendiente, start] = useTransition()

  const vista = (texto: string, original: string, cuando: string) => armarMensaje(texto.trim() || original, { ...EJEMPLO, gimnasio: gym.nombre, cuando })

  return (
    <Panel titulo="Mensajes de WhatsApp" descripcion="Con estos textos se arman los avisos de cuota. Dejalos vacíos para usar el texto original.">
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await guardarMensajesWhatsApp({ msgPorVencer: porVencer, msgVencida: vencida })
            if (r.ok) toast.success("Mensajes guardados.")
            else toast.error(r.error)
          })
        }}
      >
        <p className="text-xs text-muted-foreground">
          Podés usar: {VARIABLES_MENSAJE.map((v) => (
            <code key={v} className="mr-1.5 rounded bg-muted px-1.5 py-0.5">
              {v}
            </code>
          ))}
          . <code className="rounded bg-muted px-1.5 py-0.5">{"{cuando}"}</code> completa la frase, por ejemplo “vence mañana (23/11)” o “venció hace 3 días (20/11)”.
        </p>

        <Field label="Cuota por vencer" htmlFor="msg-por-vencer">
          <Textarea id="msg-por-vencer" rows={3} value={porVencer} onChange={(e) => setPorVencer(e.target.value)} placeholder={PLANTILLA_POR_VENCER} maxLength={500} />
          <p className="mt-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Vista previa:</strong> {vista(porVencer, PLANTILLA_POR_VENCER, "vence mañana (23/11)")}
          </p>
        </Field>

        <Field label="Cuota vencida" htmlFor="msg-vencida">
          <Textarea id="msg-vencida" rows={3} value={vencida} onChange={(e) => setVencida(e.target.value)} placeholder={PLANTILLA_VENCIDA} maxLength={500} />
          <p className="mt-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Vista previa:</strong> {vista(vencida, PLANTILLA_VENCIDA, "venció hace 3 días (20/11)")}
          </p>
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar mensajes"}
          </Button>
        </div>
      </form>
    </Panel>
  )
}
