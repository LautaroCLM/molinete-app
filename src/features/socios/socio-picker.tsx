"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { EstadoBadge } from "@/components/shared/estado-badge"
import { Button } from "@/components/ui/button"
import { usePanel } from "@/components/layout/panel-context"
import { dni } from "@/lib/format"
import type { SocioIndice } from "@/lib/data"
import { buscarSocios } from "./buscar"

/** Buscador de socios con teclado: escribir, flechas, Enter. */
export function SocioPicker({
  onElegir,
  placeholder = "Escribí nombre, apellido o DNI…",
  ayuda,
}: {
  onElegir: (s: SocioIndice) => void
  placeholder?: string
  ayuda?: React.ReactNode
}) {
  const { socios } = usePanel()
  const [q, setQ] = useState("")
  const resultados = useMemo(() => buscarSocios(socios, q, 6), [socios, q])

  return (
    <Command shouldFilter={false} loop className="rounded-xl! border bg-card p-0">
      <CommandInput autoFocus value={q} onValueChange={setQ} placeholder={placeholder} className="text-base" />
      <CommandList className="max-h-80">
        {!q && <div className="px-4 py-5 text-sm text-muted-foreground">{ayuda ?? "Tip: con el DNI es más rápido."}</div>}
        {q && (
          <CommandEmpty className="flex flex-col items-center gap-3 py-6">
            <span>No encontramos a nadie con “{q}”.</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/clientes/nuevo">
                <UserPlus /> Dar de alta un socio
              </Link>
            </Button>
          </CommandEmpty>
        )}
        {resultados.map((s) => (
          <CommandItem key={s.id} value={s.id} onSelect={() => onElegir(s)} className="gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem] font-semibold">
                {s.apellido}, {s.nombre}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                DNI {dni(s.dni)} · {s.plan}
              </p>
            </div>
            <EstadoBadge estado={s.estado} />
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  )
}
