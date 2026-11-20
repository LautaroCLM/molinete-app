import { MensajesWhatsApp } from "@/features/configuracion/mensajes-whatsapp"
import { LogoGimnasio } from "@/features/configuracion/logo-gimnasio"
import { GimnasioForm } from "@/features/configuracion/gimnasio-form"
import { getSesion } from "@/lib/data"

export const metadata = { title: "Configuración" }

export default async function ConfigGimnasioPage() {
  const { gym } = await getSesion()
  return (
    <div className="flex flex-col gap-6">
      <LogoGimnasio gym={gym} />
      <GimnasioForm gym={gym} />
      <MensajesWhatsApp gym={gym} />
    </div>
  )
}
