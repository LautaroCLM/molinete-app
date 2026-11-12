import Link from "next/link"
import { UserPlus } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { SociosTabla } from "@/features/socios/socios-tabla"
import { MenuExportar } from "@/components/shared/menu-exportar"
import { getSesion, getSocios, type FiltroSocios } from "@/lib/data"
import { puede } from "@/lib/permissions"

export const metadata = { title: "Socios" }

const VALIDOS: FiltroSocios[] = ["todos", "activos", "por_vencer", "vencidos", "inactivos"]

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro } = await searchParams
  const inicial = VALIDOS.includes(filtro as FiltroSocios) ? (filtro as FiltroSocios) : "todos"
  const socios = await getSocios("todos")
  const { usuario } = await getSesion()

  return (
    <>
      <PageHeader
        titulo="Socios"
        descripcion="Buscá, filtrá y gestioná a las personas que entrenan en el gimnasio."
        acciones={
          <>
            {puede(usuario.rol, "reportes.ver") && (
              <MenuExportar
                tipo="socios"
                opciones={[
                  { label: "Todos", params: "filtro=todos" },
                  { label: "Activos", params: "filtro=activos" },
                  { label: "Por vencer", params: "filtro=por_vencer" },
                  { label: "Vencidos", params: "filtro=vencidos" },
                  { label: "Inactivos", params: "filtro=inactivos" },
                ]}
              />
            )}
            <Button asChild size="lg">
              <Link href="/clientes/nuevo">
                <UserPlus /> Nuevo socio
              </Link>
            </Button>
          </>
        }
      />
      <SociosTabla socios={socios} filtroInicial={inicial} />
    </>
  )
}
