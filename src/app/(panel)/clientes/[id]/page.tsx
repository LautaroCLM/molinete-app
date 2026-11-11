import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Banknote, DoorOpen, Pencil, Phone, Mail, CalendarDays, IdCard, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Panel } from "@/components/shared/page-header"
import { ESTILO_ESTADO, Disco } from "@/components/shared/estado-badge"
import { BotonAccion } from "@/components/shared/boton-accion"
import { CalendarioAsistencias } from "@/features/socios/calendario-asistencias"
import { BajaSocioBoton } from "@/features/socios/baja-socio"
import { AbrirCobro } from "@/features/cobros/abrir-cobro"
import { getSocio } from "@/lib/data"
import { dni, fecha, fechaHora, hace, pesos } from "@/lib/format"
import { ESTADOS_CUOTA, MEDIOS_PAGO } from "@/lib/labels"
import { cn } from "@/lib/utils"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const data = await getSocio((await params).id)
  return { title: data ? `${data.socio.nombre} ${data.socio.apellido}` : "Socio" }
}

export default async function SocioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ cobrar?: string }>
}) {
  const { id } = await params
  const cobrar = (await searchParams).cobrar === "1"
  const data = await getSocio(id)
  if (!data) notFound()
  const { socio, pagos, asistencias, ultimos30 } = data
  const e = ESTILO_ESTADO[socio.estado.estado]
  const debe = socio.estado.estado === "vencido" || socio.estado.estado === "en_gracia"

  return (
    <>
      {cobrar && <AbrirCobro socioId={socio.id} />}
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Socios
      </Link>

      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {socio.nombre} {socio.apellido}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {socio.plan?.nombre} · socio desde el {fecha(socio.fechaAlta)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonAccion accion={{ tipo: "llegada", socioId: socio.id }} variant={debe ? "outline" : "default"} size="lg">
            <DoorOpen /> Registrar llegada
          </BotonAccion>
          <BotonAccion accion={{ tipo: "cobro", socioId: socio.id }} variant={debe ? "default" : "outline"} size="lg">
            <Banknote /> Cobrar
          </BotonAccion>
          <Button asChild variant="outline" size="lg">
            <Link href={`/clientes/${socio.id}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="flex flex-col gap-6">
          <section className={cn("rounded-xl p-5", e.fondo)}>
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">Estado de la cuota</span>
              <Disco estado={socio.estado.estado} className="size-8 border-[8px]" />
            </div>
            <p className={cn("num-display mt-3 text-5xl", e.texto)}>{ESTADOS_CUOTA[socio.estado.estado]}</p>
            <p className={cn("mt-1 font-medium", e.texto)}>{socio.estado.resumen}</p>
            {socio.vencimiento && socio.plan?.tipo !== "por_clase" && (
              <p className="mt-4 border-t border-current/10 pt-3 text-sm text-muted-foreground">
                {debe ? "Venció" : "Vence"} el <strong className="text-foreground">{fecha(socio.vencimiento)}</strong>
              </p>
            )}
          </section>

          <Panel titulo="Datos">
            <dl className="flex flex-col gap-3 text-sm">
              <Dato icono={<IdCard />} etiqueta="DNI" valor={dni(socio.dni)} />
              <Dato icono={<Phone />} etiqueta="Teléfono" valor={socio.telefono || "Sin cargar"} />
              <Dato icono={<Mail />} etiqueta="Email" valor={socio.email || "Sin cargar"} />
              <Dato icono={<CalendarDays />} etiqueta="Alta" valor={fecha(socio.fechaAlta)} />
              {socio.observaciones && <Dato icono={<StickyNote />} etiqueta="Observaciones" valor={socio.observaciones} />}
            </dl>
          </Panel>

          <BajaSocioBoton id={socio.id} nombre={`${socio.nombre} ${socio.apellido}`} activo={socio.activo} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            titulo="Asistencias"
            descripcion={
              socio.ultimaAsistencia
                ? `${ultimos30} en los últimos 30 días · la última fue ${hace(socio.ultimaAsistencia)}`
                : "Todavía no registró asistencias"
            }
          >
            <CalendarioAsistencias fechas={asistencias.map((a) => a.fecha)} />
          </Panel>

          <Tabs defaultValue="pagos" className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 pt-3 pb-3">
              <TabsList>
                <TabsTrigger value="pagos">Pagos ({pagos.length})</TabsTrigger>
                <TabsTrigger value="asistencias">Historial de asistencias ({asistencias.length})</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="pagos" className="m-0">
              {pagos.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No hay pagos registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4 text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Concepto</TableHead>
                      <TableHead className="hidden text-xs sm:table-cell">Medio</TableHead>
                      <TableHead className="hidden text-xs md:table-cell">Cubre hasta</TableHead>
                      <TableHead className="hidden text-xs lg:table-cell">Cobró</TableHead>
                      <TableHead className="pr-4 text-right text-xs">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.slice(0, 30).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="pl-4 tabular-nums">{fechaHora(p.fecha)}</TableCell>
                        <TableCell>{p.plan?.nombre}</TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{MEDIOS_PAGO[p.medio]}</TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {p.vencimientoHasta ? fecha(p.vencimientoHasta) : "—"}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">{p.usuario?.nombre}</TableCell>
                        <TableCell className="pr-4 text-right font-semibold tabular-nums">{pesos(p.monto)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="asistencias" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 text-xs">Fecha y hora</TableHead>
                    <TableHead className="text-xs">Cómo ingresó</TableHead>
                    <TableHead className="pr-4 text-xs">Registró</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asistencias.slice(0, 40).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="pl-4 tabular-nums">{fechaHora(a.fecha)}</TableCell>
                      <TableCell className="text-muted-foreground">{a.origen === "qr" ? "QR en la entrada" : "Recepción"}</TableCell>
                      <TableCell className="pr-4 text-muted-foreground">{a.usuarioId ? "Recepción" : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

function Dato({ icono, etiqueta, valor }: { icono: React.ReactNode; etiqueta: string; valor: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4">{icono}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
        <dd className="break-words">{valor}</dd>
      </div>
    </div>
  )
}
