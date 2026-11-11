import Link from "next/link"
import { UserPlus } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { SociosTabla } from "@/features/socios/socios-tabla"
import { getSocios, type FiltroSocios } from "@/lib/data"

export const metadata = { title: "Socios" }

const VALIDOS: FiltroSocios[] = ["todos", "activos", "por_vencer", "vencidos", "inactivos"]

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro } = await searchParams
  const inicial = VALIDOS.includes(filtro as FiltroSocios) ? (filtro as FiltroSocios) : "todos"
  const socios = await getSocios("todos")

  return (
    <>
      <PageHeader
        titulo="Socios"
        descripcion="Buscá, filtrá y gestioná a las personas que entrenan en el gimnasio."
        acciones={
          <Button asChild size="lg">
            <Link href="/clientes/nuevo">
              <UserPlus /> Nuevo socio
            </Link>
          </Button>
        }
      />
      <SociosTabla socios={socios} filtroInicial={inicial} />
    </>
  )
}
