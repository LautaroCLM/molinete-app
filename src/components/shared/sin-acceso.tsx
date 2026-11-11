import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "./page-header"

export function SinAcceso({ seccion }: { seccion: string }) {
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icono={<Lock />}
        titulo={`${seccion} es solo para el dueño`}
        descripcion="Si necesitás ver esta información, pedile al dueño del gimnasio que te dé acceso."
        accion={
          <Button asChild variant="outline">
            <Link href="/">Volver al inicio</Link>
          </Button>
        }
      />
    </div>
  )
}
