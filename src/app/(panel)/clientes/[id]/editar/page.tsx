import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { SocioForm } from "@/features/socios/socio-form"
import { getPlanes, getSocio } from "@/lib/data"

export const metadata = { title: "Editar socio" }

export default async function EditarSocioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, planes] = await Promise.all([getSocio(id), getPlanes()])
  if (!data) notFound()
  const { socio } = data
  return (
    <>
      <Link href={`/clientes/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {socio.nombre} {socio.apellido}
      </Link>
      <PageHeader titulo="Editar datos" />
      <SocioForm planes={planes} socio={socio} />
    </>
  )
}
