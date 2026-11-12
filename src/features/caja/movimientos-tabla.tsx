"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Ban, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Field } from "@/components/shared/field"
import { anularMovimiento } from "@/lib/actions"
import { anulacionSchema } from "@/lib/schemas"
import { CATEGORIAS_MOVIMIENTO, MEDIOS_PAGO } from "@/lib/labels"
import { fechaHora, hora, normalizar, pesos } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MovimientoDetalle } from "@/lib/data"
import type { MedioPago } from "@/types/domain"

export function MovimientosTabla({
  movimientos,
  puedeAnular,
  mostrarFecha = false,
  mostrarUsuario = false,
  limite = 150,
}: {
  movimientos: MovimientoDetalle[]
  puedeAnular: boolean
  mostrarFecha?: boolean
  mostrarUsuario?: boolean
  limite?: number
}) {
  const [q, setQ] = useState("")
  const [tipo, setTipo] = useState<"todos" | "ingreso" | "egreso">("todos")
  const [medio, setMedio] = useState<"todos" | MedioPago>("todos")
  const [anulando, setAnulando] = useState<MovimientoDetalle | null>(null)

  const visibles = useMemo(() => {
    const n = normalizar(q)
    return movimientos
      .filter(
        (m) =>
          (tipo === "todos" || m.tipo === tipo) &&
          (medio === "todos" || m.medio === medio) &&
          (!n || normalizar(`${m.descripcion} ${CATEGORIAS_MOVIMIENTO[m.categoria].label}`).includes(n)),
      )
      .slice(0, limite)
  }, [movimientos, q, tipo, medio, limite])

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la descripción" className="pl-9" aria-label="Buscar movimientos" />
        </div>
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Ingresos y egresos</SelectItem>
            <SelectItem value="ingreso">Solo ingresos</SelectItem>
            <SelectItem value="egreso">Solo egresos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={medio} onValueChange={(v) => setMedio(v as typeof medio)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Medio de pago">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los medios</SelectItem>
            {(Object.keys(MEDIOS_PAGO) as MedioPago[]).map((m) => (
              <SelectItem key={m} value={m}>
                {MEDIOS_PAGO[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4 text-xs">{mostrarFecha ? "Fecha" : "Hora"}</TableHead>
            <TableHead className="text-xs">Detalle</TableHead>
            <TableHead className="hidden text-xs md:table-cell">Medio</TableHead>
            {mostrarUsuario && <TableHead className="hidden text-xs lg:table-cell">Usuario</TableHead>}
            <TableHead className="text-right text-xs">Monto</TableHead>
            {puedeAnular && <TableHead className="w-12 pr-4" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibles.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No hay movimientos para mostrar.
              </TableCell>
            </TableRow>
          )}
          {visibles.map((m) => {
            const anulado = !!m.anulacion
            return (
              <TableRow key={m.id} className={cn(anulado && "text-muted-foreground")}>
                <TableCell className="pl-4 whitespace-nowrap tabular-nums">{mostrarFecha ? fechaHora(m.fecha) : hora(m.fecha)}</TableCell>
                <TableCell className="max-w-[22rem]">
                  <p className={cn("truncate font-medium", anulado && "line-through")}>{m.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIAS_MOVIMIENTO[m.categoria].label}
                    {anulado && (
                      <span className="text-bad">
                        {" "}
                        · Anulado por {m.anuladoPor?.nombre}: {m.anulacion!.motivo}
                      </span>
                    )}
                  </p>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{MEDIOS_PAGO[m.medio]}</TableCell>
                {mostrarUsuario && <TableCell className="hidden text-muted-foreground lg:table-cell">{m.usuario?.nombre}</TableCell>}
                <TableCell
                  className={cn(
                    "text-right font-semibold whitespace-nowrap tabular-nums",
                    anulado ? "line-through" : m.tipo === "egreso" ? "text-bad" : "",
                  )}
                >
                  {m.tipo === "egreso" ? "− " : "+ "}
                  {pesos(m.monto)}
                </TableCell>
                {puedeAnular && (
                  <TableCell className="pr-4">
                    {!anulado && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm" onClick={() => setAnulando(m)} aria-label={`Anular ${m.descripcion}`}>
                            <Ban />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Anular</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {movimientos.length > limite && (
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">Se muestran los {limite} movimientos más recientes.</p>
      )}
      <AnularDialog movimiento={anulando} cerrar={() => setAnulando(null)} />
    </div>
  )
}

function AnularDialog({ movimiento, cerrar }: { movimiento: MovimientoDetalle | null; cerrar: () => void }) {
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()
  return (
    <Dialog
      open={!!movimiento}
      onOpenChange={(o) => {
        if (!o) {
          cerrar()
          setMotivo("")
          setError(undefined)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular movimiento</DialogTitle>
          <DialogDescription>
            El movimiento no se borra: queda tachado, con tu nombre y el motivo, y deja de sumar en la caja.
            {movimiento && (movimiento.categoria === "cuota" || movimiento.categoria === "clase") &&
              " Además, el socio vuelve a su vencimiento y plan anteriores."}
            {movimiento?.categoria === "venta_producto" && " Además, el stock de los productos vendidos se repone."}
          </DialogDescription>
        </DialogHeader>
        {movimiento && (
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="font-medium">{movimiento.descripcion}</p>
            <p className="text-muted-foreground">
              {fechaHora(movimiento.fecha)} · {pesos(movimiento.monto)} · {MEDIOS_PAGO[movimiento.medio]}
            </p>
          </div>
        )}
        <Field label="Motivo" htmlFor="motivo" error={error}>
          <Textarea id="motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: Se cargó dos veces" autoFocus />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pendiente}
            onClick={() => {
              const r = anulacionSchema.safeParse({ movimientoId: movimiento?.id, motivo })
              if (!r.success) return setError(r.error.issues[0].message)
              start(async () => {
                const res = await anularMovimiento(r.data)
                if (!res.ok) return void toast.error(res.error)
                toast.success("Movimiento anulado.")
                cerrar()
                setMotivo("")
              })
            }}
          >
            Anular movimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
