import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { SocioForm } from "@/features/socios/socio-form"
import { getPlanes } from "@/lib/data"

export const metadata = { title: "Nuevo socio" }

export default async function NuevoSocioPage() {
  const planes = await getPlanes()
  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Socios
      </Link>
      <PageHeader titulo="Nuevo socio" descripcion="Con nombre, apellido y DNI alcanza. El resto lo podés completar después." />
      <SocioForm planes={planes} />
    </>
  )
}
