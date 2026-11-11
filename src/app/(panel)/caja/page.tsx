import Link from "next/link"
import { parseISO, startOfDay, startOfMonth } from "date-fns"
import { TriangleAlert } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader, Panel } from "@/components/shared/page-header"
import { Tablero, Indicador } from "@/components/shared/tablero"
import { TabsLink } from "@/components/shared/tabs-link"
import { Barras } from "@/components/shared/barras"
import { AbrirCajaForm, CerrarCajaBoton, MovimientoBoton } from "@/features/caja/caja-acciones"
import { MovimientosTabla } from "@/features/caja/movimientos-tabla"
import {
  getCajaAbierta,
  getCajasAbiertas,
  getCajasCerradas,
  getMovimientos,
  getSesion,
  getTotales,
  type ResumenCaja,
  type Totales,
} from "@/lib/data"
import { puede } from "@/lib/permissions"
import { CATEGORIAS_MOVIMIENTO, MEDIOS_PAGO } from "@/lib/labels"
import { fecha, fechaHora, hora, pesos } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CategoriaMovimiento, MedioPago } from "@/types/domain"

export const metadata = { title: "Caja" }

type Vista = "resumen" | "cajas" | "movimientos" | "mi-caja"
type Periodo = "hoy" | "mes" | "total"

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ vista?: string; periodo?: string }> }) {
  const sp = await searchParams
  const { usuario } = await getSesion()
  const esDueno = puede(usuario.rol, "caja.ver_todas")
  const vista: Vista = esDueno ? ((["resumen", "cajas", "movimientos", "mi-caja"].includes(sp.vista ?? "") ? sp.vista : "resumen") as Vista) : "mi-caja"

  return (
    <>
      <PageHeader titulo="Caja" descripcion={esDueno ? "Ingresos, egresos y cajas de cada turno." : "Tu caja del turno: cobros, ventas y gastos."} />
      {esDueno && (
        <TabsLink
          activo={vista}
          items={[
            { id: "resumen", label: "Resumen", href: "/caja" },
            { id: "cajas", label: "Cajas por turno", href: "/caja?vista=cajas" },
            { id: "movimientos", label: "Todos los movimientos", href: "/caja?vista=movimientos" },
            { id: "mi-caja", label: "Mi caja", href: "/caja?vista=mi-caja" },
          ]}
        />
      )}
      {vista === "resumen" && <Resumen periodo={(["hoy", "mes", "total"].includes(sp.periodo ?? "") ? sp.periodo : "hoy") as Periodo} />}
      {vista === "cajas" && <Cajas />}
      {vista === "movimientos" && <TodosMovimientos />}
      {vista === "mi-caja" && <MiCaja usuarioId={usuario.id} puedeAnular={puede(usuario.rol, "caja.anular_movimiento")} />}
    </>
  )
}

// ---------- Mi caja ----------
async function MiCaja({ usuarioId, puedeAnular }: { usuarioId: string; puedeAnular: boolean }) {
  const caja = await getCajaAbierta(usuarioId)
  if (!caja) {
    const ultimas = await getCajasCerradas(1)
    return <AbrirCajaForm sugerido={ultimas[0]?.caja.montoContado ?? 20000} />
  }
  const movimientos = await getMovimientos({ cajaId: caja.caja.id })
  const deAyer = parseISO(caja.caja.apertura) < startOfDay(new Date())

  return (
    <div className="flex flex-col gap-6">
      {deAyer && (
        <p className="flex items-center gap-2 rounded-xl border border-bad/25 bg-bad-soft px-4 py-3 text-sm text-bad">
          <TriangleAlert className="size-4 shrink-0" /> Esta caja está abierta desde el {fechaHora(caja.caja.apertura)}. Cerrala antes de empezar el turno.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Abierta a las <strong className="text-foreground">{hora(caja.caja.apertura)}</strong>
          {deAyer && ` del ${fecha(caja.caja.apertura)}`} · {caja.cantidad} movimientos
        </p>
        <div className="flex flex-wrap gap-2">
          <MovimientoBoton tipo="egreso" />
          <MovimientoBoton tipo="ingreso" />
          <CerrarCajaBoton cajaId={caja.caja.id} esperado={caja.efectivoEsperado} inicial={caja.caja.montoInicial} />
        </div>
      </div>
      <Tablero className="sm:grid-cols-4">
        <Indicador destacado etiqueta="Efectivo esperado en caja" valor={pesos(caja.efectivoEsperado)} detalle={`Inicial ${pesos(caja.caja.montoInicial)} + efectivo del turno`} />
        <Indicador etiqueta="Ingresos" valor={pesos(caja.ingresos)} />
        <Indicador etiqueta="Egresos" valor={pesos(caja.egresos)} />
        <Indicador etiqueta="Efectivo" valor={pesos(caja.porMedio.efectivo)} />
        <Indicador etiqueta="Transferencia" valor={pesos(caja.porMedio.transferencia)} />
        <Indicador etiqueta="Mercado Pago" valor={pesos(caja.porMedio.mercado_pago)} />
        <Indicador etiqueta="Tarjeta" valor={pesos(caja.porMedio.tarjeta)} />
      </Tablero>
      <MovimientosTabla movimientos={movimientos} puedeAnular={puedeAnular} />
      {!puedeAnular && (
        <p className="text-xs text-muted-foreground">Si cargaste algo mal, pedile al dueño que lo anule. Los movimientos no se borran.</p>
      )}
    </div>
  )
}

// ---------- Resumen (dueño) ----------
async function Resumen({ periodo }: { periodo: Periodo }) {
  const ahora = new Date()
  const desde = periodo === "hoy" ? startOfDay(ahora) : periodo === "mes" ? startOfMonth(ahora) : new Date(0)
  const t = await getTotales(desde)
  const abiertas = await getCajasAbiertas()
  const etiqueta = { hoy: "hoy", mes: "este mes", total: "desde el inicio" }[periodo]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Período" className="inline-flex rounded-lg border bg-card p-1">
          {(
            [
              ["hoy", "Hoy"],
              ["mes", "Este mes"],
              ["total", "Total"],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={`/caja?periodo=${id}`}
              role="tab"
              aria-selected={periodo === id}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                periodo === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {abiertas.length === 0 ? "No hay cajas abiertas." : `Cajas abiertas: ${abiertas.map((c) => c.usuario?.nombre).join(", ")}.`}
        </p>
        <MovimientoBoton tipo="egreso" sinCaja />
        </div>
      </div>

      <Tablero className="sm:grid-cols-3">
        <Indicador etiqueta={`Ingresos ${etiqueta}`} valor={pesos(t.ingresos)} />
        <Indicador etiqueta={`Egresos ${etiqueta}`} valor={pesos(t.egresos)} />
        <Indicador etiqueta="Resultado" valor={pesos(t.ingresos - t.egresos)} tono={t.ingresos - t.egresos >= 0 ? "ok" : "bad"} />
      </Tablero>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel titulo="Ingresos por medio de pago">
          <Barras
            filas={(Object.keys(MEDIOS_PAGO) as MedioPago[]).map((m) => ({ label: MEDIOS_PAGO[m], valor: t.porMedio[m] }))}
            total={t.ingresos}
          />
        </Panel>
        <Panel titulo="Por categoría">
          <CategoriasTabla t={t} />
        </Panel>
      </div>
    </div>
  )
}

function CategoriasTabla({ t }: { t: Totales }) {
  const filas = (Object.entries(t.porCategoria) as [CategoriaMovimiento, number][]).sort((a, b) => b[1] - a[1])
  return (
    <Table>
      <TableBody>
        {filas.map(([c, v]) => {
          const egreso = CATEGORIAS_MOVIMIENTO[c].tipo === "egreso"
          return (
            <TableRow key={c}>
              <TableCell className="pl-0">{CATEGORIAS_MOVIMIENTO[c].label}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{egreso ? "Egreso" : "Ingreso"}</TableCell>
              <TableCell className={cn("pr-0 text-right font-semibold tabular-nums", egreso && "text-bad")}>
                {egreso ? "− " : ""}
                {pesos(v)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ---------- Cajas por turno (dueño) ----------
async function Cajas() {
  const [abiertas, cerradas] = await Promise.all([getCajasAbiertas(), getCajasCerradas(20)])
  return (
    <div className="flex flex-col gap-6">
      <Panel titulo="Abiertas ahora" contenidoClassName="px-0 pb-0">
        <TablaCajas cajas={abiertas} abiertas />
      </Panel>
      <Panel titulo="Últimos cierres" contenidoClassName="px-0 pb-0">
        <TablaCajas cajas={cerradas} />
      </Panel>
    </div>
  )
}

function TablaCajas({ cajas, abiertas = false }: { cajas: ResumenCaja[]; abiertas?: boolean }) {
  if (cajas.length === 0) return <p className="px-5 pb-5 text-sm text-muted-foreground">No hay cajas abiertas.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5 text-xs">Usuario</TableHead>
          <TableHead className="text-xs">Apertura</TableHead>
          {!abiertas && <TableHead className="hidden text-xs md:table-cell">Cierre</TableHead>}
          <TableHead className="hidden text-right text-xs sm:table-cell">Ingresos</TableHead>
          <TableHead className="text-right text-xs">Efectivo esperado</TableHead>
          {!abiertas && <TableHead className="text-right text-xs">Contado</TableHead>}
          {!abiertas && <TableHead className="pr-5 text-right text-xs">Diferencia</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {cajas.map((c) => {
          const dif = c.caja.montoContado !== null ? c.caja.montoContado - c.efectivoEsperado : null
          const vieja = abiertas && parseISO(c.caja.apertura) < startOfDay(new Date())
          return (
            <TableRow key={c.caja.id}>
              <TableCell className="pl-5 font-medium">
                {c.usuario?.nombre} {c.usuario?.apellido}
                {vieja && <span className="ml-2 rounded-full bg-bad-soft px-2 py-0.5 text-xs font-semibold text-bad">Sin cerrar desde ayer</span>}
              </TableCell>
              <TableCell className="tabular-nums">{fechaHora(c.caja.apertura)}</TableCell>
              {!abiertas && <TableCell className="hidden tabular-nums md:table-cell">{c.caja.cierre ? hora(c.caja.cierre) : ""}</TableCell>}
              <TableCell className="hidden text-right tabular-nums sm:table-cell">{pesos(c.ingresos)}</TableCell>
              <TableCell className="text-right tabular-nums">{pesos(c.efectivoEsperado)}</TableCell>
              {!abiertas && <TableCell className="text-right tabular-nums">{pesos(c.caja.montoContado ?? 0)}</TableCell>}
              {!abiertas && (
                <TableCell
                  className={cn("pr-5 text-right font-semibold tabular-nums", dif === 0 ? "text-ok" : dif! < 0 ? "text-bad" : "text-warn")}
                  title={c.caja.observaciones || undefined}
                >
                  {dif === 0 ? "Sin diferencia" : pesos(dif ?? 0)}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ---------- Todos los movimientos (dueño) ----------
async function TodosMovimientos() {
  const movimientos = await getMovimientos({ desde: startOfMonth(new Date()) })
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Movimientos de este mes, de todas las cajas.</p>
      <MovimientosTabla movimientos={movimientos} puedeAnular mostrarFecha mostrarUsuario limite={300} />
    </div>
  )
}
