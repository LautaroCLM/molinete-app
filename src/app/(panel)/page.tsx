import { SocioAvatar } from "@/components/shared/socio-avatar"
import Link from "next/link"
import { PackageOpen, Wallet, DoorOpen, ChevronRight } from "lucide-react"
import { PageHeader, Panel } from "@/components/shared/page-header"
import { Tablero, Indicador } from "@/components/shared/tablero"
import { EstadoBadge } from "@/components/shared/estado-badge"
import { BotonAccion } from "@/components/shared/boton-accion"
import { Button } from "@/components/ui/button"
import { GraficoAsistenciasHora, GraficoIngresosMes } from "@/features/dashboard/graficos"
import { getAsistencias, getCajaAbierta, getDashboard, getSesion } from "@/lib/data"
import { puede } from "@/lib/permissions"
import { fechaLarga, hora, num, pesos, fechaHora } from "@/lib/format"
import { MEDIOS_PAGO } from "@/lib/labels"
import type { MedioPago } from "@/types/domain"

export const metadata = { title: "Inicio" }

function saludo() {
  const h = new Date().getHours()
  return h < 13 ? "Buen día" : h < 20 ? "Buenas tardes" : "Buenas noches"
}

export default async function DashboardPage() {
  const { usuario } = await getSesion()
  const [d, llegadas, miCaja] = await Promise.all([
    getDashboard(),
    getAsistencias({ limite: 8 }),
    getCajaAbierta(usuario.id),
  ])
  const verTotales = puede(usuario.rol, "dashboard.totales")
  const dif = d.asistenciasHoy - d.asistenciasAyer
  const mesNombre = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(new Date())

  return (
    <>
      <PageHeader
        titulo={`${saludo()}, ${usuario.nombre}`}
        descripcion={<span className="first-letter:uppercase inline-block">{fechaLarga(new Date())}</span>}
        acciones={
          <BotonAccion accion={{ tipo: "llegada" }} size="lg">
            <DoorOpen /> Registrar llegada
          </BotonAccion>
        }
      />

      {(d.cajasViejas.length > 0 || d.stockBajo.length > 0) && (
        <div className="mb-6 flex flex-col gap-2 lg:flex-row">
          {d.cajasViejas.map((c) => (
            <Link
              key={c.caja.id}
              href="/caja"
              className="group flex flex-1 items-center gap-3 rounded-xl border border-bad/25 bg-bad-soft px-4 py-3 text-sm"
            >
              <Wallet className="size-5 shrink-0 text-bad" />
              <span className="flex-1">
                <strong className="font-semibold text-bad">Caja sin cerrar.</strong>{" "}
                La caja de {c.usuario?.nombre} {c.usuario?.apellido} está abierta desde el {fechaHora(c.caja.apertura)}.
              </span>
              <ChevronRight className="size-4 text-bad transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
          {d.stockBajo.length > 0 && (
            <Link
              href="/inventario?filtro=bajo"
              className="group flex flex-1 items-center gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm"
            >
              <PackageOpen className="size-5 shrink-0 text-warn" />
              <span className="flex-1">
                <strong className="font-semibold text-warn">Stock bajo en {d.stockBajo.length} productos:</strong>{" "}
                {d.stockBajo
                  .slice(0, 3)
                  .map((p) => p.nombre)
                  .join(", ")}
                {d.stockBajo.length > 3 && " y más"}.
              </span>
              <ChevronRight className="size-4 text-warn transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}

      <Tablero className="mb-6 sm:grid-cols-3">
        {verTotales ? (
          <>
            <Indicador destacado className="sm:row-span-1" etiqueta="Ingresos de hoy" valor={pesos(d.ingresos.dia)} detalle={resumenMedios(d.ingresos.diaPorMedio)} />
            <Indicador etiqueta={`Ingresos de ${mesNombre}`} valor={pesos(d.ingresos.mes)} detalle={`Egresos: ${pesos(d.ingresos.mesEgresos)}`} />
            <Indicador
              etiqueta={`Ganancia de ${mesNombre}`}
              valor={pesos(d.ingresos.mes - d.ingresos.mesEgresos)}
              tono={d.ingresos.mes - d.ingresos.mesEgresos >= 0 ? "ok" : "bad"}
              detalle="Ingresos menos egresos"
            />
            <Indicador
              etiqueta="En caja ahora"
              valor={pesos(d.efectivoEnCaja)}
              detalle={d.cantidadCajasAbiertas === 0 ? "No hay cajas abiertas" : `Efectivo de ${d.cantidadCajasAbiertas} ${d.cantidadCajasAbiertas === 1 ? "caja abierta" : "cajas abiertas"}`}
            />
            <Indicador etiqueta="Ingresos totales" valor={pesos(d.ingresos.total)} detalle="Desde que usás Molinete" />
          </>
        ) : (
          <Indicador
            destacado
            etiqueta="Tu caja"
            valor={miCaja ? pesos(miCaja.ingresos) : "Cerrada"}
            detalle={miCaja ? `${miCaja.cantidad} movimientos en este turno` : "Abrila para empezar a cobrar"}
          />
        )}
        <Indicador
          etiqueta="Asistencias hoy"
          valor={num(d.asistenciasHoy)}
          detalle={dif === 0 ? "Igual que ayer a esta hora" : `${dif > 0 ? "+" : ""}${dif} vs. ayer a esta hora`}
        />
        <Indicador etiqueta="Socios activos" valor={num(d.sociosActivos)} />
        <Indicador etiqueta="Vencen en 7 días" valor={num(d.porVencer.length)} tono="warn" />
        <Indicador etiqueta="Cuotas vencidas" valor={num(d.vencidos.length)} tono="bad" />
      </Tablero>

      <div className="stagger mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {verTotales ? (
          <Panel titulo={`Ingresos de ${mesNombre}`} descripcion="Por día. La barra más oscura es hoy.">
            <GraficoIngresosMes datos={d.ingresosPorDia} />
          </Panel>
        ) : (
          <UltimasLlegadas llegadas={llegadas} />
        )}
        <Panel titulo="Asistencias por horario" descripcion="Hoy comparado con el promedio de este mismo día.">
          <GraficoAsistenciasHora datos={d.porHora} />
        </Panel>
      </div>

      <div className="stagger grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          titulo="Cuotas por vencer"
          descripcion="Próximos 7 días"
          accion={
            <Button asChild variant="ghost" size="sm">
              <Link href="/clientes?filtro=por_vencer">Ver todas</Link>
            </Button>
          }
          contenidoClassName="px-2 pb-2"
        >
          <ListaSocios socios={d.porVencer.slice(0, 7)} accion="Cobrar" />
        </Panel>
        <Panel
          titulo="Cuotas vencidas"
          descripcion="Incluye a quienes están en días de gracia"
          accion={
            <Button asChild variant="ghost" size="sm">
              <Link href="/clientes?filtro=vencidos">Ver todas</Link>
            </Button>
          }
          contenidoClassName="px-2 pb-2"
        >
          <ListaSocios
            socios={d.vencidos.sort((a, b) => (b.estado.dias ?? -999) - (a.estado.dias ?? -999)).slice(0, 7)}
            accion="Cobrar"
          />
        </Panel>
        {verTotales ? <UltimasLlegadas llegadas={llegadas} /> : null}
      </div>
    </>
  )
}

function resumenMedios(porMedio: Record<MedioPago, number>) {
  const top = (Object.entries(porMedio) as [MedioPago, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
  if (top.length === 0) return "Todavía no hubo cobros"
  return top.map(([m, v]) => `${MEDIOS_PAGO[m]} ${pesos(v)}`).join(" · ")
}

type SocioLista = Awaited<ReturnType<typeof getDashboard>>["porVencer"][number]

function ListaSocios({ socios, accion }: { socios: SocioLista[]; accion: string }) {
  if (socios.length === 0) return <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nadie por acá. Todo en orden.</p>
  return (
    <ul className="divide-y">
      {socios.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
          <SocioAvatar id={s.id} nombre={s.nombre} apellido={s.apellido} />
          <Link href={`/clientes/${s.id}`} className="min-w-0 flex-1 hover:underline">
            <p className="truncate text-sm font-semibold">
              {s.nombre} {s.apellido}
            </p>
            <p className="truncate text-xs text-muted-foreground">{s.plan?.nombre}</p>
          </Link>
          <EstadoBadge estado={s.estado.estado} className="hidden sm:inline-flex">
            {s.estado.resumen.replace(", está en días de gracia", "")}
          </EstadoBadge>
          <BotonAccion accion={{ tipo: "cobro", socioId: s.id }} variant="outline" size="sm">
            {accion}
          </BotonAccion>
        </li>
      ))}
    </ul>
  )
}

function UltimasLlegadas({ llegadas }: { llegadas: Awaited<ReturnType<typeof getAsistencias>> }) {
  return (
    <Panel
      titulo="Últimas llegadas"
      accion={
        <Button asChild variant="ghost" size="sm">
          <Link href="/asistencias">Ver todas</Link>
        </Button>
      }
      contenidoClassName="px-2 pb-2"
    >
      {llegadas.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">Todavía no llegó nadie hoy.</p>
      ) : (
        <ul className="divide-y">
          {llegadas.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-11 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{hora(a.fecha)}</span>
              <SocioAvatar id={a.socio.id} nombre={a.socio.nombre} apellido={a.socio.apellido} className="size-7 text-[0.65rem]" />
              <Link href={`/clientes/${a.socio.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                {a.socio.nombre} {a.socio.apellido}
              </Link>
              <EstadoBadge estado={a.socio.estado.estado} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
