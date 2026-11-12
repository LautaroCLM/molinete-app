import { SocioAvatar } from "@/components/shared/socio-avatar"
import Link from "next/link"
import { addDays, format, isToday, parseISO, startOfDay, subDays, endOfDay, isValid } from "date-fns"
import { ChevronLeft, ChevronRight, DoorOpen, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader, Panel, EmptyState } from "@/components/shared/page-header"
import { Tablero, Indicador } from "@/components/shared/tablero"
import { EstadoBadge } from "@/components/shared/estado-badge"
import { BotonAccion } from "@/components/shared/boton-accion"
import { MenuExportar } from "@/components/shared/menu-exportar"
import { contarAsistencias, getAsistencias, getSesion } from "@/lib/data"
import { puede } from "@/lib/permissions"
import { fechaLarga, hora, num } from "@/lib/format"

export const metadata = { title: "Asistencias" }

export default async function AsistenciasPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams
  const { usuario } = await getSesion()
  const parsed = dia ? parseISO(dia) : new Date()
  const elegido = startOfDay(isValid(parsed) ? parsed : new Date())
  const esHoy = isToday(elegido)

  const hoy = startOfDay(new Date())
  const [delDia, semana, mes] = await Promise.all([
    getAsistencias({ desde: elegido, hasta: endOfDay(elegido), limite: 1000 }),
    contarAsistencias(subDays(hoy, 6)),
    contarAsistencias(subDays(hoy, 29)),
  ])
  // Días hábiles de los últimos 30 (el gimnasio cierra los domingos)
  const diasConActividad = Array.from({ length: 30 }, (_, i) => subDays(hoy, i)).filter((d) => d.getDay() !== 0).length
  const porHora = new Map<number, number>()
  for (const a of delDia) {
    const h = parseISO(a.fecha).getHours()
    porHora.set(h, (porHora.get(h) ?? 0) + 1)
  }
  const pico = [...porHora.entries()].sort((a, b) => b[1] - a[1])[0]
  const porQr = delDia.filter((a) => a.origen === "qr").length

  const link = (d: Date) => `/asistencias?dia=${format(d, "yyyy-MM-dd")}`

  return (
    <>
      <PageHeader
        titulo="Asistencias"
        descripcion="Quién vino y a qué hora."
        acciones={
          <>
            {puede(usuario.rol, "reportes.ver") && <MenuExportar tipo="asistencias" opciones={[{ label: "Hoy", params: "rango=hoy" }, { label: "Este mes", params: "rango=mes" }, { label: "Mes anterior", params: "rango=mes_anterior" }, { label: "Todo el historial", params: "rango=todo" }]} />}
            <BotonAccion accion={{ tipo: "llegada" }} size="lg">
              <DoorOpen /> Registrar llegada
            </BotonAccion>
          </>
        }
      />

      <Tablero className="mb-6 sm:grid-cols-4">
        <Indicador etiqueta={esHoy ? "Hoy" : "Ese día"} valor={num(delDia.length)} detalle={`${porQr} por QR`} />
        <Indicador etiqueta="Últimos 7 días" valor={num(semana)} />
        <Indicador etiqueta="Promedio por día" valor={num(Math.round(mes / diasConActividad))} detalle="Últimos 30 días, sin domingos" />
        <Indicador
          etiqueta="Horario con más gente"
          valor={pico ? `${pico[0]} a ${pico[0] + 1} h` : "—"}
          detalle={pico ? `${pico[1]} llegadas` : "Sin datos"}
        />
      </Tablero>

      <Panel
        titulo={<span className="first-letter:uppercase inline-block">{esHoy ? `Hoy, ${fechaLarga(elegido)}` : fechaLarga(elegido)}</span>}
        accion={
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon-sm" aria-label="Día anterior">
              <Link href={link(subDays(elegido, 1))}>
                <ChevronLeft />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={esHoy}>
              <Link href="/asistencias">Hoy</Link>
            </Button>
            <Button asChild variant="outline" size="icon-sm" aria-label="Día siguiente" className={esHoy ? "pointer-events-none opacity-40" : ""}>
              <Link href={link(addDays(elegido, 1))} aria-disabled={esHoy} tabIndex={esHoy ? -1 : 0}>
                <ChevronRight />
              </Link>
            </Button>
          </div>
        }
        contenidoClassName="px-0 pb-0"
      >
        {delDia.length === 0 ? (
          <EmptyState
            titulo={esHoy ? "Todavía no llegó nadie" : "No hubo asistencias ese día"}
            descripcion={esHoy ? "Cuando registres una llegada aparece acá." : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20 pl-5 text-xs">Hora</TableHead>
                <TableHead className="text-xs">Socio</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Plan</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="hidden pr-5 text-xs sm:table-cell">Ingreso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delDia.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="pl-5 font-semibold tabular-nums">{hora(a.fecha)}</TableCell>
                  <TableCell>
                    <Link href={`/clientes/${a.socio.id}`} className="inline-flex items-center gap-2.5 font-medium hover:underline">
                      <SocioAvatar id={a.socio.id} nombre={a.socio.nombre} apellido={a.socio.apellido} className="size-7 text-[0.65rem]" />
                      {a.socio.apellido}, {a.socio.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{a.socio.plan?.nombre}</TableCell>
                  <TableCell>
                    <EstadoBadge estado={a.socio.estado.estado} />
                  </TableCell>
                  <TableCell className="hidden pr-5 text-muted-foreground sm:table-cell">
                    {a.origen === "qr" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <QrCode className="size-3.5" /> QR
                      </span>
                    ) : (
                      `Recepción · ${a.usuario?.nombre ?? ""}`
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  )
}
