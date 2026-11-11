import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageHeader, Panel } from "@/components/shared/page-header"
import { getGimnasioAdmin } from "@/lib/data/admin"
import { fecha, num } from "@/lib/format"
import type { Rol } from "@/types/domain"
import { UsuariosAdmin } from "./usuarios-admin"

export default async function GimnasioAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const data = await getGimnasioAdmin(id)
  if (!data) notFound()
  const { gym, usuarios, socios } = data

  const datos: [string, string][] = [
    ["Dirección", [gym.direccion, gym.localidad].filter(Boolean).join(", ") || "—"],
    ["Teléfono", gym.telefono || "—"],
    ["Email", gym.email || "—"],
    ["Socios activos", num(socios)],
    ["Alta", fecha(gym.created_at)],
  ]

  return (
    <>
      <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Gimnasios
      </Link>
      <PageHeader titulo={gym.nombre} />
      <div className="flex flex-col gap-6">
        <Panel titulo="Datos">
          <dl className="grid gap-4 sm:grid-cols-3">
            {datos.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <UsuariosAdmin
          gymId={gym.id}
          usuarios={usuarios.map((u) => ({
            id: u.id,
            nombre: u.nombre,
            apellido: u.apellido,
            email: u.email,
            rol: u.rol as Rol,
            activo: u.activo,
            ultimo_acceso: u.ultimo_acceso,
          }))}
        />
      </div>
    </>
  )
}
