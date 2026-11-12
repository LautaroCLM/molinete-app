"use client"

import { SocioAvatar } from "@/components/shared/socio-avatar"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DoorOpen, Banknote, ShoppingBag, UserPlus, Wallet } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { EstadoBadge } from "@/components/shared/estado-badge"
import { buscarSocios } from "@/features/socios/buscar"
import { dni } from "@/lib/format"
import { NAV } from "./nav"
import { usePanel } from "./panel-context"

const BusquedaCtx = createContext<{ abrirBusqueda: () => void }>({ abrirBusqueda: () => {} })
export const useBusqueda = () => useContext(BusquedaCtx)

export function BusquedaProvider({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const { abrir } = usePanel()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setAbierto((v) => !v)
      } else if (e.key === "F2") {
        e.preventDefault()
        setAbierto(false)
        abrir({ tipo: "llegada" })
      } else if (e.key === "F3") {
        e.preventDefault()
        setAbierto(false)
        abrir({ tipo: "cobro" })
      } else if (e.key === "F4") {
        e.preventDefault()
        setAbierto(false)
        abrir({ tipo: "venta" })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [abrir])

  const ctx = useMemo(() => ({ abrirBusqueda: () => setAbierto(true) }), [])

  return (
    <BusquedaCtx.Provider value={ctx}>
      {children}
      <CommandDialog
        open={abierto}
        onOpenChange={setAbierto}
        title="Buscar"
        description="Buscá un socio por nombre o DNI, o una sección."
        className="sm:max-w-xl"
      >
        {abierto && <Paleta cerrar={() => setAbierto(false)} />}
      </CommandDialog>
    </BusquedaCtx.Provider>
  )
}

function Paleta({ cerrar }: { cerrar: () => void }) {
  const [q, setQ] = useState("")
  const { socios, abrir, puede } = usePanel()
  const router = useRouter()
  const resultados = useMemo(() => buscarSocios(socios, q, 7), [socios, q])

  const ir = (href: string) => {
    cerrar()
    router.push(href)
  }

  return (
    <Command shouldFilter={false} loop>
      <CommandInput value={q} onValueChange={setQ} placeholder="Nombre, apellido o DNI…" className="text-base" />
      <CommandList className="max-h-[min(28rem,60vh)]">
        <CommandEmpty>No encontramos socios con “{q}”. Probá con el DNI o dalo de alta.</CommandEmpty>
        {resultados.length > 0 && (
          <CommandGroup heading="Socios">
            {resultados.map((s) => (
              <CommandItem key={s.id} value={`socio-${s.id}`} onSelect={() => ir(`/clientes/${s.id}`)} className="gap-3 py-2.5">
                <SocioAvatar id={s.id} nombre={s.nombre} apellido={s.apellido} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {s.apellido}, {s.nombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    DNI {dni(s.dni)} · {s.plan}
                  </p>
                </div>
                <EstadoBadge estado={s.estado} className="hidden sm:inline-flex">
                  {s.resumen}
                </EstadoBadge>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    cerrar()
                    abrir({ tipo: "llegada", socioId: s.id })
                  }}
                  className="rounded-md border bg-background px-2 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Llegó
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!q && (
          <>
            <CommandGroup heading="Acciones">
              <CommandItem value="registrar llegada" onSelect={() => (cerrar(), abrir({ tipo: "llegada" }))}>
                <DoorOpen /> Registrar llegada <CommandShortcut>F2</CommandShortcut>
              </CommandItem>
              <CommandItem value="cobrar cuota clase" onSelect={() => (cerrar(), abrir({ tipo: "cobro" }))}>
                <Banknote /> Cobrar cuota o clase <CommandShortcut>F3</CommandShortcut>
              </CommandItem>
              <CommandItem value="vender producto" onSelect={() => (cerrar(), abrir({ tipo: "venta" }))}>
                <ShoppingBag /> Vender productos <CommandShortcut>F4</CommandShortcut>
              </CommandItem>
              <CommandItem value="nuevo socio alta" onSelect={() => ir("/clientes/nuevo")}>
                <UserPlus /> Dar de alta un socio
              </CommandItem>
              <CommandItem value="abrir cerrar caja" onSelect={() => ir("/caja")}>
                <Wallet /> Abrir o cerrar caja
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Ir a">
              {NAV.filter((i) => !i.permiso || puede(i.permiso)).map((i) => (
                <CommandItem key={i.href} value={`ir ${i.label}`} onSelect={() => ir(i.href)}>
                  <i.icono /> {i.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  )
}
