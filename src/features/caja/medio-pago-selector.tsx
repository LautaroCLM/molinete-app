"use client"

import { Banknote, Landmark, CreditCard, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"
import { MEDIOS_PAGO } from "@/lib/labels"
import type { MedioPago } from "@/types/domain"

const ICONOS: Record<MedioPago, React.ComponentType<{ className?: string }>> = {
  efectivo: Banknote,
  transferencia: Landmark,
  mercado_pago: QrCode,
  tarjeta: CreditCard,
}

export function MedioPagoSelector({
  value,
  onChange,
  id,
}: {
  value: MedioPago | undefined
  onChange: (m: MedioPago) => void
  id?: string
}) {
  return (
    <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(Object.keys(MEDIOS_PAGO) as MedioPago[]).map((m) => {
        const Icono = ICONOS[m]
        const activo = value === m
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(m)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border bg-background text-sm font-medium transition-colors",
              "hover:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
              activo && "border-primary bg-accent text-accent-foreground ring-1 ring-primary",
            )}
          >
            <Icono className="size-5" />
            {MEDIOS_PAGO[m]}
          </button>
        )
      })}
    </div>
  )
}
