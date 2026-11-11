import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader, Panel } from "@/components/shared/page-header"
import { Tablero, Indicador } from "@/components/shared/tablero"
import { Barras } from "@/components/shared/barras"
import { EstadoBadge } from "@/components/shared/estado-badge"
import { SinAcceso } from "@/components/shared/sin-acceso"
import { GraficoIngresosPeriodo, MapaCalor } from "@/features/reportes/graficos"
import { getReportes, getSesion } from "@/lib/data"
import { puede } from "@/lib/permissions"
import { CATEGORIAS_MOVIMIENTO, MEDIOS_PAGO } from "@/lib/labels"
import { hace, num, pesos } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CategoriaMovimiento, MedioPago } from "@/types/domain"

export const metadata = { title: "Reportes" }

const PERIODOS = [7, 30, 60] as const

function variacion(actual: number, anterior: number) {
  if (!anterior) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { usuario, gym } = await getSesion()
  if (!puede(usuario.rol, "reportes.ver"))
    return (
      <>
        <PageHeader titulo="Reportes" />
        <SinAcceso seccion="Reportes" />
      </>
    )

  const pedido = Number((await searchParams).dias)
  const dias = (PERIODOS as readonly number[]).includes(pedido) ? pedido : 30
  const r = await getReportes(dias)
  const resultado = r.actual.ingresos - r.actual.egresos
  const vIng = variacion(r.actual.ingresos, r.anterior.ingresos)
  const ingresosPorCategoria = (Object.entries(r.actual.porCategoria) as [CategoriaMovimiento, number][])
    .filter(([c]) => CATEGORIAS_MOVIMIENTO[c].tipo === "ingreso")
    .map(([c, v]) => ({ label: CATEGORIAS_MOVIMIENTO[c].label, valor: v }))
  const gananciaTotal = r.ganancias.reduce((s, g) => s + g.ganancia, 0)

  return (
    <>
      <PageHeader
        titulo="Reportes"
        descripcion="Cómo viene el gimnasio: plata, horarios y socios."
        acciones={
          <div role="tablist" aria-label="Período" className="inline-flex rounded-lg border bg-card p-1">
            {PERIODOS.map((p) => (
              <Link
                key={p}
                href={`/reportes?dias=${p}`}
                role="tab"
                aria-selected={dias === p}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  dias === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="hidden sm:inline">Últimos </span>
                {p} días
              </Link>
            ))}
          </div>
        }
      />

      <Tablero className="mb-6 sm:grid-cols-4">
        <Indicador
          etiqueta="Ingresos"
          valor={pesos(r.actual.ingresos)}
          detalle={vIng === null ? undefined : `${vIng >= 0 ? "+" : ""}${vIng}% vs. los ${dias} días anteriores`}
        />
        <Indicador etiqueta="Egresos" valor={pesos(r.actual.egresos)} />
        <Indicador etiqueta="Resultado" valor={pesos(resultado)} tono={resultado >= 0 ? "ok" : "bad"} />
        <Indicador etiqueta="Asistencias" valor={num(r.totalAsistencias)} detalle={`${num(Math.round(r.totalAsistencias / dias))} por día en promedio`} />
      </Tablero>

      <Panel titulo="Ingresos por día" className="mb-6">
        <GraficoIngresosPeriodo datos={r.porDia} />
      </Panel>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel titulo="Ingresos por medio de pago">
          <Barras filas={(Object.keys(MEDIOS_PAGO) as MedioPago[]).map((m) => ({ label: MEDIOS_PAGO[m], valor: r.actual.porMedio[m] }))} total={r.actual.ingresos} />
        </Panel>
        <Panel titulo="Ingresos por categoría">
          <Barras filas={ingresosPorCategoria} total={r.actual.ingresos} />
        </Panel>
      </div>

      <Panel titulo="Horarios pico" descripcion="Cuánta gente llega, en promedio, cada día y hora." className="mb-6">
        <MapaCalor datos={r.calor} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          titulo="Socios que dejaron de venir"
          descripcion={`Activos sin asistencias en los últimos ${gym.config.diasInactividad} días. Un mensaje a tiempo puede evitar una baja.`}
          contenidoClassName="px-0 pb-0"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 text-xs">Socio</TableHead>
                <TableHead className="text-xs">Última visita</TableHead>
                <TableHead className="hidden text-xs sm:table-cell">Cuota</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.dejaronDeVenir.slice(0, 12).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-5">
                    <Link href={`/clientes/${s.id}`} className="font-medium hover:underline">
                      {s.nombre} {s.apellido}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground first-letter:uppercase">{s.ultimaAsistencia ? hace(s.ultimaAsistencia) : "Nunca"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <EstadoBadge estado={s.estado.estado} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <a
                      href={`https://wa.me/549${s.telefono.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <MessageCircle className="size-4" /> WhatsApp
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {r.dejaronDeVenir.length > 12 && <p className="border-t px-5 py-3 text-xs text-muted-foreground">Y {r.dejaronDeVenir.length - 12} más.</p>}
        </Panel>

        <Panel titulo="Ganancia de productos" descripcion={`${pesos(gananciaTotal)} de ganancia en el período (precio de venta menos costo).`} contenidoClassName="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 text-xs">Producto</TableHead>
                <TableHead className="text-right text-xs">Unidades</TableHead>
                <TableHead className="hidden text-right text-xs sm:table-cell">Vendido</TableHead>
                <TableHead className="pr-5 text-right text-xs">Ganancia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.ganancias.map((g) => (
                <TableRow key={g.producto.id}>
                  <TableCell className="pl-5 font-medium">{g.producto.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.unidades}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">{pesos(g.ingresos)}</TableCell>
                  <TableCell className="pr-5 text-right font-semibold text-ok tabular-nums">{pesos(g.ganancia)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  )
}
