import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Panel } from "@/components/shared/page-header"
import { getAuditoria } from "@/lib/data"
import { fechaHora } from "@/lib/format"

export const metadata = { title: "Registro de actividad" }

export default async function ActividadPage() {
  const registros = await getAuditoria(80)
  return (
    <Panel
      titulo="Registro de actividad"
      descripcion="Quién hizo qué y cuándo. No se puede editar ni borrar."
      contenidoClassName="px-0 pb-0"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5 text-xs">Fecha</TableHead>
            <TableHead className="text-xs">Usuario</TableHead>
            <TableHead className="text-xs">Acción</TableHead>
            <TableHead className="hidden pr-5 text-xs md:table-cell">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="pl-5 whitespace-nowrap tabular-nums">{fechaHora(r.fecha)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {r.usuario?.nombre} {r.usuario?.apellido}
              </TableCell>
              <TableCell className="font-medium whitespace-nowrap">{r.accion}</TableCell>
              <TableCell className="hidden max-w-md truncate pr-5 text-muted-foreground md:table-cell">{r.detalle}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  )
}
