import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, PageHeader, Panel } from "@/components/shared/page-header"
import { listarGimnasios } from "@/lib/data/admin"
import { fecha, hace, num } from "@/lib/format"

export default async function AdminPage() {
  const gimnasios = await listarGimnasios()
  return (
    <>
      <PageHeader
        titulo="Gimnasios"
        descripcion={`${gimnasios.length} ${gimnasios.length === 1 ? "cuenta creada" : "cuentas creadas"}.`}
        acciones={
          <Button asChild size="lg">
            <Link href="/admin/nuevo">
              <Plus /> Nuevo gimnasio
            </Link>
          </Button>
        }
      />
      <Panel contenidoClassName="px-0 pb-0 pt-0">
        {gimnasios.length === 0 ? (
          <EmptyState
            icono={<Building2 />}
            titulo="Todavía no hay gimnasios"
            descripcion="Creá el primero: cargás los datos del gimnasio, su dueño y, si los pidió, sus empleados."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 text-xs">Gimnasio</TableHead>
                <TableHead className="text-right text-xs">Socios</TableHead>
                <TableHead className="text-right text-xs">Usuarios</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Último ingreso</TableHead>
                <TableHead className="hidden pr-5 text-xs md:table-cell">Alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gimnasios.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="pl-5">
                    <Link href={`/admin/${g.id}`} className="font-semibold hover:underline">
                      {g.nombre}
                    </Link>
                    {g.localidad && <p className="text-xs text-muted-foreground">{g.localidad}</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{num(g.socios)}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.usuariosActivos}</TableCell>
                  <TableCell className="hidden text-muted-foreground first-letter:uppercase md:table-cell">
                    {g.ultimoAcceso ? hace(g.ultimoAcceso) : "Nunca"}
                  </TableCell>
                  <TableCell className="hidden pr-5 text-muted-foreground tabular-nums md:table-cell">{fecha(g.creado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  )
}
