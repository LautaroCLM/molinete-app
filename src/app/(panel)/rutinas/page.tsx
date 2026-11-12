import Link from "next/link"
import { Dumbbell, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState, PageHeader, Panel } from "@/components/shared/page-header"
import { AccionesRutina } from "@/features/rutinas/acciones-rutina"
import { getRutinas, type RutinaResumen } from "@/lib/data"
import { num } from "@/lib/format"

export const metadata = { title: "Rutinas" }

export default async function RutinasPage() {
  const rutinas = await getRutinas()
  const activas = rutinas.filter((r) => r.activo)
  const archivadas = rutinas.filter((r) => !r.activo)

  return (
    <>
      <PageHeader
        titulo="Rutinas"
        descripcion="Armalas una vez y asignalas a cada socio. Cada socio ve en su perfil qué día le toca hoy."
        acciones={
          <Button asChild size="lg">
            <Link href="/rutinas/nueva">
              <Plus /> Nueva rutina
            </Link>
          </Button>
        }
      />

      {activas.length === 0 ? (
        <EmptyState
          icono={<Dumbbell />}
          titulo="Todavía no armaste rutinas"
          descripcion="Creá la primera: por ejemplo “Rutina 1” con tres días de entrenamiento. Después se la asignás a un socio desde su ficha."
          accion={
            <Button asChild>
              <Link href="/rutinas/nueva">
                <Plus /> Crear una rutina
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activas.map((r) => (
            <TarjetaRutina key={r.id} r={r} />
          ))}
        </div>
      )}

      {archivadas.length > 0 && (
        <div className="mt-10">
          <Panel titulo="Archivadas" descripcion="No se ofrecen para asignar y los socios ya no las ven. Podés restaurarlas.">
            <ul className="divide-y">
              {archivadas.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="font-medium text-muted-foreground">{r.nombre}</span>
                  <AccionesRutina id={r.id} nombre={r.nombre} activo={false} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  )
}

function TarjetaRutina({ r }: { r: RutinaResumen }) {
  return (
    <section className="surface flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold">{r.nombre}</h2>
        {r.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.descripcion}</p>}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Dato valor={num(r.dias)} etiqueta={r.dias === 1 ? "día" : "días"} />
        <Dato valor={num(r.ejercicios)} etiqueta={r.ejercicios === 1 ? "ejercicio" : "ejercicios"} />
        <Dato valor={num(r.socios)} etiqueta={r.socios === 1 ? "socio" : "socios"} />
      </dl>
      <div className="mt-auto">
        <AccionesRutina id={r.id} nombre={r.nombre} activo />
      </div>
    </section>
  )
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dd className="num-display text-2xl">{valor}</dd>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
    </div>
  )
}
