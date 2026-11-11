"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Search, PackagePlus, Pencil, ArrowDownUp, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, PrefijoPesos } from "@/components/shared/field"
import { ajustarStock, guardarProducto } from "@/lib/actions"
import { ajusteStockSchema, productoSchema } from "@/lib/schemas"
import { CATEGORIAS_PRODUCTO } from "@/lib/labels"
import { normalizar, pesos } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CategoriaProducto, Producto } from "@/types/domain"

export function ProductosTabla({
  productos,
  verCostos,
  puedeEditar,
  soloBajo,
}: {
  productos: Producto[]
  verCostos: boolean
  puedeEditar: boolean
  soloBajo: boolean
}) {
  const [q, setQ] = useState("")
  const [bajo, setBajo] = useState(soloBajo)
  const [categoria, setCategoria] = useState<"todas" | CategoriaProducto>("todas")
  const [ajuste, setAjuste] = useState<Producto | null>(null)
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null)
  const cantBajo = productos.filter((p) => p.stock <= p.stockMinimo).length

  const visibles = useMemo(() => {
    const n = normalizar(q)
    return productos.filter(
      (p) =>
        (!n || normalizar(p.nombre).includes(n)) &&
        (categoria === "todas" || p.categoria === categoria) &&
        (!bajo || p.stock <= p.stockMinimo),
    )
  }, [productos, q, categoria, bajo])

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto" className="pl-9" aria-label="Buscar producto" />
        </div>
        <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
          <SelectTrigger className="w-full lg:w-48" aria-label="Categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {(Object.keys(CATEGORIAS_PRODUCTO) as CategoriaProducto[]).map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORIAS_PRODUCTO[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={bajo ? "default" : "outline"} onClick={() => setBajo((b) => !b)} aria-pressed={bajo}>
          <TriangleAlert /> Stock bajo ({cantBajo})
        </Button>
        {puedeEditar && (
          <Button variant="outline" onClick={() => setEditando("nuevo")}>
            <PackagePlus /> Nuevo producto
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 text-xs">Producto</TableHead>
            {verCostos && <TableHead className="hidden text-right text-xs md:table-cell">Costo</TableHead>}
            <TableHead className="text-right text-xs">Precio</TableHead>
            {verCostos && <TableHead className="hidden text-right text-xs lg:table-cell">Margen</TableHead>}
            <TableHead className="w-48 text-xs">Stock</TableHead>
            <TableHead className="pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibles.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No hay productos para mostrar.
              </TableCell>
            </TableRow>
          )}
          {visibles.map((p) => {
            const esBajo = p.stock <= p.stockMinimo
            const margen = p.precio > 0 ? Math.round(((p.precio - p.costo) / p.precio) * 100) : 0
            const ref = Math.max(p.stockMinimo * 3, p.stock, 1)
            return (
              <TableRow key={p.id}>
                <TableCell className="pl-4">
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">{CATEGORIAS_PRODUCTO[p.categoria]}</p>
                </TableCell>
                {verCostos && <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">{pesos(p.costo)}</TableCell>}
                <TableCell className="text-right font-semibold tabular-nums">{pesos(p.precio)}</TableCell>
                {verCostos && <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">{margen}%</TableCell>}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className={cn("w-8 text-right font-semibold tabular-nums", esBajo && "text-bad")}>{p.stock}</span>
                    <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className={cn("absolute inset-y-0 left-0 rounded-full", esBajo ? "bg-bad" : "bg-[var(--chart-2)]")} style={{ width: `${Math.min(100, (p.stock / ref) * 100)}%` }} />
                      <span className="absolute inset-y-0 w-0.5 bg-foreground/40" style={{ left: `${(p.stockMinimo / ref) * 100}%` }} />
                    </span>
                  </div>
                  <p className={cn("mt-0.5 text-xs", esBajo ? "font-medium text-bad" : "text-muted-foreground")}>
                    {esBajo ? `Reponer · mínimo ${p.stockMinimo}` : `Mínimo ${p.stockMinimo}`}
                  </p>
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onClick={() => setAjuste(p)}>
                      <ArrowDownUp /> Stock
                    </Button>
                    {puedeEditar && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditando(p)} aria-label={`Editar ${p.nombre}`}>
                        <Pencil />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <AjusteDialog producto={ajuste} cerrar={() => setAjuste(null)} />
      <ProductoDialog producto={editando} cerrar={() => setEditando(null)} />
    </div>
  )
}

function AjusteDialog({ producto, cerrar }: { producto: Producto | null; cerrar: () => void }) {
  const [tipo, setTipo] = useState<"entrada" | "ajuste">("entrada")
  const [cantidad, setCantidad] = useState("")
  const [nota, setNota] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [pendiente, start] = useTransition()
  const n = Number(cantidad || 0)

  return (
    <Dialog open={!!producto} onOpenChange={(o) => !o && (cerrar(), setCantidad(""), setNota(""), setErrores({}))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimiento de stock</DialogTitle>
          <DialogDescription>{producto?.nombre} · hay {producto?.stock} unidades.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
          {(
            [
              ["entrada", "Entrada de mercadería", "Llegó un pedido"],
              ["ajuste", "Ajuste", "Roturas, vencidos, conteo"],
            ] as const
          ).map(([id, t, d]) => (
            <button
              key={id}
              role="radio"
              aria-checked={tipo === id}
              onClick={() => setTipo(id)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors hover:border-ring/60",
                tipo === id && "border-primary bg-accent ring-1 ring-primary",
              )}
            >
              <span className="block font-semibold">{t}</span>
              <span className="text-xs text-muted-foreground">{d}</span>
            </button>
          ))}
        </div>
        <Field
          label={tipo === "entrada" ? "Unidades que entran" : "Unidades (negativo para restar)"}
          htmlFor="ajuste-cant"
          error={errores.cantidad}
          hint={producto && cantidad && !isNaN(n) ? `Queda en ${producto.stock + (tipo === "entrada" ? Math.abs(n) : n)} unidades.` : undefined}
        >
          <Input id="ajuste-cant" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/[^\d-]/g, ""))} autoFocus className="tabular-nums" />
        </Field>
        <Field label="Motivo" htmlFor="ajuste-nota" error={errores.nota}>
          <Textarea id="ajuste-nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={tipo === "entrada" ? "Ej.: Pedido distribuidora" : "Ej.: Dos botellas vencidas"} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente}
            onClick={() => {
              const datos = { productoId: producto?.id, tipo, cantidad: tipo === "entrada" ? Math.abs(n) : n, nota }
              const r = ajusteStockSchema.safeParse(datos)
              if (!r.success) return setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
              start(async () => {
                const res = await ajustarStock(r.data)
                if (!res.ok) return void toast.error(res.error)
                toast.success(`Stock de ${producto?.nombre} actualizado.`)
                cerrar()
                setCantidad("")
                setNota("")
              })
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProductoDialog({ producto, cerrar }: { producto: Producto | "nuevo" | null; cerrar: () => void }) {
  const p = producto && producto !== "nuevo" ? producto : null
  return (
    <Dialog open={!!producto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{p ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>El margen se calcula solo con el costo y el precio.</DialogDescription>
        </DialogHeader>
        {producto && <ProductoForm key={p?.id ?? "nuevo"} producto={p} cerrar={cerrar} />}
      </DialogContent>
    </Dialog>
  )
}

function ProductoForm({ producto, cerrar }: { producto: Producto | null; cerrar: () => void }) {
  const [d, setD] = useState({
    nombre: producto?.nombre ?? "",
    categoria: producto?.categoria ?? "bebidas",
    costo: String(producto?.costo ?? ""),
    precio: String(producto?.precio ?? ""),
    stock: String(producto?.stock ?? "0"),
    stockMinimo: String(producto?.stockMinimo ?? "5"),
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [pendiente, start] = useTransition()
  const num = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value.replace(/\D/g, "") }))
  const margen = Number(d.precio) > 0 ? Math.round(((Number(d.precio) - Number(d.costo)) / Number(d.precio)) * 100) : null

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const r = productoSchema.safeParse(d)
        if (!r.success) return setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
        start(async () => {
          const res = await guardarProducto(r.data, producto?.id)
          if (!res.ok) return void toast.error(res.error)
          toast.success(producto ? "Producto actualizado." : `${r.data.nombre} agregado al inventario.`)
          cerrar()
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field label="Nombre" htmlFor="prod-nombre" error={errores.nombre}>
          <Input id="prod-nombre" value={d.nombre} onChange={(e) => setD((x) => ({ ...x, nombre: e.target.value }))} autoFocus />
        </Field>
        <Field label="Categoría" htmlFor="prod-cat">
          <Select value={d.categoria} onValueChange={(v) => setD((x) => ({ ...x, categoria: v as CategoriaProducto }))}>
            <SelectTrigger id="prod-cat" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORIAS_PRODUCTO) as CategoriaProducto[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIAS_PRODUCTO[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Precio de costo" htmlFor="prod-costo" error={errores.costo}>
          <PrefijoPesos>
            <Input id="prod-costo" inputMode="numeric" value={d.costo} onChange={num("costo")} className="tabular-nums" />
          </PrefijoPesos>
        </Field>
        <Field label="Precio de venta" htmlFor="prod-precio" error={errores.precio} hint={margen !== null ? `Margen: ${margen}%` : undefined}>
          <PrefijoPesos>
            <Input id="prod-precio" inputMode="numeric" value={d.precio} onChange={num("precio")} className="tabular-nums" />
          </PrefijoPesos>
        </Field>
        {!producto && (
          <Field label="Stock inicial" htmlFor="prod-stock" error={errores.stock}>
            <Input id="prod-stock" inputMode="numeric" value={d.stock} onChange={num("stock")} className="tabular-nums" />
          </Field>
        )}
        <Field label="Stock mínimo" htmlFor="prod-min" error={errores.stockMinimo} hint="Te avisamos cuando quede esto o menos.">
          <Input id="prod-min" inputMode="numeric" value={d.stockMinimo} onChange={num("stockMinimo")} className="tabular-nums" />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={cerrar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendiente}>
          {producto ? "Guardar cambios" : "Agregar producto"}
        </Button>
      </DialogFooter>
    </form>
  )
}
