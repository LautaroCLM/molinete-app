import { notFound } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { RutinaEditor } from "@/features/rutinas/rutina-editor"
import { getRutina } from "@/lib/data"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: (await params).id === "nueva" ? "Nueva rutina" : "Editar rutina" }
}

export default async function RutinaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rutina = id === "nueva" ? undefined : await getRutina(id)
  if (id !== "nueva" && !rutina) notFound()

  return (
    <>
      <PageHeader
        titulo={rutina ? rutina.nombre : "Nueva rutina"}
        descripcion="Escribí los ejercicios de cada día. El socio ve el día que le toca según las veces que viene."
      />
      <RutinaEditor key={rutina?.id ?? "nueva"} rutina={rutina ?? undefined} />
    </>
  )
}
