"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Minus, Plus, Search, Trash2, ShoppingBag } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/shared/field"
import { usePanel } from "@/components/layout/panel-context"
import { MedioPagoSelector } from "@/features/caja/medio-pago-selector"
import { registrarVenta } from "@/lib/actions"
import { normalizar, pesos } from "@/lib/format"
import { MEDIOS_PAGO } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { MedioPago } from "@/types/domain"

export function VentaDialog() {
  const { accion, cerrar } = usePanel()
  const abierto = accion?.tipo === "venta"
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-5 pb-4">
          <DialogTitle className="font-display text-2xl font-semibold">Vender productos</DialogTitle>
          <DialogDescription>Descuenta el stock y suma la venta a tu caja.</DialogDescription>
        </DialogHeader>
        {abierto && <FormVenta />}
      </DialogContent>
    </Dialog>
  )
}

export function FormVenta({ onListo }: { onListo?: () => void }) {
  const { productos, cerrar } = usePanel()
  const [q, setQ] = useState("")
  const [carrito, setCarrito] = useState<Record<string, number>>({})
  const [medio, setMedio] = useState<MedioPago | undefined>("efectivo")
  const [pendiente, start] = useTransition()

  const visibles = useMemo(() => {
    const n = normalizar(q)
    return productos.filter((p) => p.activo && (!n || normalizar(p.nombre).includes(n)))
  }, [productos, q])

  const items = Object.entries(carrito)
    .filter(([, c]) => c > 0)
    .map(([id, cantidad]) => ({ producto: productos.find((p) => p.id === id)!, cantidad }))
  const total = items.reduce((s, i) => s + i.producto.precio * i.cantidad, 0)

  function sumar(id: string, delta: number) {
    const p = productos.find((x) => x.id === id)!
    setCarrito((c) => {
      const nueva = Math.max(0, Math.min(p.stock, (c[id] ?? 0) + delta))
      if (delta > 0 && nueva === (c[id] ?? 0)) toast.warning(`No hay más stock de ${p.nombre}.`)
      return { ...c, [id]: nueva }
    })
  }

  function cobrar() {
    if (!medio) return void toast.error("Elegí el medio de pago.")
    start(async () => {
      const r = await registrarVenta({ items: items.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })), medio })
      if (!r.ok) return void toast.error(r.error)
      toast.success(`Venta registrada: ${pesos(total)} en ${MEDIOS_PAGO[medio]}`)
      setCarrito({})
      if (onListo) onListo()
      else cerrar()
    })
  }

  return (
    <div className="grid border-t md:grid-cols-[1fr_18rem]">
      <div className="flex min-h-0 flex-col gap-3 p-5 md:border-r">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className="pl-9" />
        </div>
        <ul className="grid max-h-[22rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {visibles.map((p) => {
            const enCarrito = carrito[p.id] ?? 0
            const sinStock = p.stock === 0
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={sinStock}
                  onClick={() => sumar(p.id, 1)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors",
                    "hover:border-ring/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50",
                    enCarrito > 0 && "border-primary bg-accent",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.nombre}</span>
                    <span className={cn("text-xs", p.stock <= p.stockMinimo ? "text-warn" : "text-muted-foreground")}>
                      {sinStock ? "Sin stock" : `Quedan ${p.stock}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{pesos(p.precio)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-4 bg-muted/30 p-5">
        <h3 className="text-sm font-semibold">Detalle</h3>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <ShoppingBag className="size-6" />
            Tocá un producto para agregarlo.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(({ producto, cantidad }) => (
              <li key={producto.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{producto.nombre}</span>
                <div className="flex items-center rounded-md border bg-background">
                  <button type="button" aria-label="Quitar uno" onClick={() => sumar(producto.id, -1)} className="grid size-7 place-items-center hover:bg-muted">
                    {cantidad === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                  </button>
                  <span className="w-6 text-center font-semibold tabular-nums">{cantidad}</span>
                  <button type="button" aria-label="Agregar uno" onClick={() => sumar(producto.id, 1)} className="grid size-7 place-items-center hover:bg-muted">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="w-20 text-right font-medium tabular-nums">{pesos(producto.precio * cantidad)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-col gap-3">
          <Field label="Medio de pago" id="venta-medio">
            <div className="[&>div]:grid-cols-2!">
              <MedioPagoSelector id="venta-medio" value={medio} onChange={setMedio} />
            </div>
          </Field>
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="num-display text-3xl">{pesos(total)}</span>
          </div>
          <Button size="lg" disabled={items.length === 0 || pendiente} onClick={cobrar}>
            Cobrar venta
          </Button>
        </div>
      </div>
    </div>
  )
}
