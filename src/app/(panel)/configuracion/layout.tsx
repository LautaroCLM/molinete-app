import { PageHeader } from "@/components/shared/page-header"
import { SinAcceso } from "@/components/shared/sin-acceso"
import { ConfigNav } from "@/features/configuracion/config-nav"
import { getSesion } from "@/lib/data"
import { puede } from "@/lib/permissions"

export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = await getSesion()
  if (!puede(usuario.rol, "configuracion.ver"))
    return (
      <>
        <PageHeader titulo="Configuración" />
        <SinAcceso seccion="Configuración" />
      </>
    )
  return (
    <>
      <PageHeader titulo="Configuración" descripcion="Datos del gimnasio, planes, reglas de cobro y equipo." />
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <ConfigNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  )
}
