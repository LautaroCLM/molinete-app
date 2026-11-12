import { ShoppingBag } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader, Panel } from "@/components/shared/page-header"
import { TabsLink } from "@/components/shared/tabs-link"
import { BotonAccion } from "@/components/shared/boton-accion"
import { ProductosTabla } from "@/features/inventario/productos-tabla"
import { getMovimientosStock, getProductos, getSesion } from "@/lib/data"
import { puede } from "@/lib/permissions"
import { fechaHora } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata = { title: "Inventario" }

const TIPO_LABEL = { entrada: "Entrada", venta: "Venta", ajuste: "Ajuste", anulacion: "Anulación" } as const

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ vista?: string; filtro?: string }> }) {
  const sp = await searchParams
  const { usuario } = await getSesion()
  const vista = sp.vista === "movimientos" ? "movimientos" : "productos"

  return (
    <>
      <PageHeader
        titulo="Inventario"
        descripcion="Productos a la venta, stock y reposiciones."
        acciones={
          <BotonAccion accion={{ tipo: "venta" }} size="lg">
            <ShoppingBag /> Vender productos
          </BotonAccion>
        }
      />
      <TabsLink
        activo={vista}
        items={[
          { id: "productos", label: "Productos", href: "/inventario" },
          { id: "movimientos", label: "Movimientos de stock", href: "/inventario?vista=movimientos" },
        ]}
      />
      {vista === "productos" ? (
        <ProductosTabla
          productos={await getProductos()}
          verCostos={puede(usuario.rol, "productos.ver_costos")}
          puedeEditar={puede(usuario.rol, "productos.editar")}
          soloBajo={sp.filtro === "bajo"}
        />
      ) : (
        <Movimientos />
      )}
    </>
  )
}

async function Movimientos() {
  const movs = await getMovimientosStock(150)
  return (
    <Panel contenidoClassName="px-0 pb-0 pt-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5 text-xs">Fecha</TableHead>
            <TableHead className="text-xs">Producto</TableHead>
            <TableHead className="text-xs">Tipo</TableHead>
            <TableHead className="text-right text-xs">Cantidad</TableHead>
            <TableHead className="hidden text-xs md:table-cell">Usuario</TableHead>
            <TableHead className="hidden pr-5 text-xs lg:table-cell">Nota</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movs.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="pl-5 tabular-nums">{fechaHora(m.fecha)}</TableCell>
              <TableCell className="font-medium">{m.producto.nombre}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    m.tipo === "entrada" && "bg-ok-soft text-ok",
                    m.tipo === "venta" && "bg-muted text-muted-foreground",
                    m.tipo === "ajuste" && "bg-warn-soft text-warn",
                    m.tipo === "anulacion" && "bg-bad-soft text-bad",
                  )}
                >
                  {TIPO_LABEL[m.tipo]}
                </span>
              </TableCell>
              <TableCell className={cn("text-right font-semibold tabular-nums", m.cantidad > 0 ? "text-ok" : "")}>
                {m.cantidad > 0 ? `+${m.cantidad}` : `−${-m.cantidad}`}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{m.usuario?.nombre}</TableCell>
              <TableCell className="hidden pr-5 text-muted-foreground lg:table-cell">{m.nota || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  )
}
