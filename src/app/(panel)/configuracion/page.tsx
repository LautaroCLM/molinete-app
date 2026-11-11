import { ImageUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/shared/page-header"
import { LogoMarca } from "@/components/layout/logo"
import { GimnasioForm } from "@/features/configuracion/gimnasio-form"
import { getSesion } from "@/lib/data"

export const metadata = { title: "Configuración" }

export default async function ConfigGimnasioPage() {
  const { gym } = await getSesion()
  return (
    <div className="flex flex-col gap-6">
      <Panel titulo="Logo" descripcion="Aparece en el encabezado y en la pantalla de ingreso por QR.">
        <div className="flex items-center gap-4">
          <div className="grid size-20 place-items-center rounded-xl border bg-muted text-foreground [--logo-hole:var(--muted)]">
            <LogoMarca className="size-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Button variant="outline" type="button" disabled>
              <ImageUp /> Subir logo
            </Button>
            <p className="text-xs text-muted-foreground">Disponible próximamente.</p>
          </div>
        </div>
      </Panel>
      <GimnasioForm gym={gym} />
    </div>
  )
}
