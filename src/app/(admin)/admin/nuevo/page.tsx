import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { AltaForm } from "./alta-form"

export const metadata = { title: "Nuevo gimnasio" }

export default function NuevoGimnasioPage() {
  return (
    <>
      <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Gimnasios
      </Link>
      <PageHeader titulo="Nuevo gimnasio" descripcion="Se crean el gimnasio, el dueño y los empleados de una vez, con su email y contraseña." />
      <AltaForm />
    </>
  )
}
