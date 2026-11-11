import { PlanesConfig, ReglasVencimiento } from "@/features/configuracion/planes-config"
import { getPlanes, getSesion } from "@/lib/data"

export const metadata = { title: "Planes y cuotas" }

export default async function PlanesPage() {
  const [{ gym }, planes] = await Promise.all([getSesion(), getPlanes()])
  return (
    <div className="flex flex-col gap-6">
      <PlanesConfig planes={planes} />
      <ReglasVencimiento config={gym.config} />
    </div>
  )
}
