import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { BibliotecaEjercicios } from "@/features/rutinas/biblioteca-ejercicios"
import { getBiblioteca } from "@/lib/data"

export const metadata = { title: "Biblioteca de ejercicios" }

export default async function BibliotecaPage() {
  const ejercicios = await getBiblioteca()
  return (
    <>
      <Link href="/rutinas" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Rutinas
      </Link>
      <PageHeader titulo="Biblioteca de ejercicios" descripcion="Tus ejercicios con su músculo y video de técnica. Se sugieren al escribir en el armado de rutinas." />
      <BibliotecaEjercicios ejercicios={ejercicios} />
    </>
  )
}
