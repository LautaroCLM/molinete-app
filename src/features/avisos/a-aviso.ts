import type { SocioConEstado } from "@/lib/data"
import type { SocioParaAvisar } from "./avisos-cuotas"

/** Pasa un socio (del servidor) a lo mínimo que necesitan los botones de aviso del navegador. */
export function aAviso(s: SocioConEstado): SocioParaAvisar {
  return {
    id: s.id,
    nombre: s.nombre,
    apellido: s.apellido,
    telefono: s.telefono,
    plan: s.plan?.nombre ?? "",
    estado: s.estado.estado,
    dias: s.estado.dias,
    vencimiento: s.vencimiento,
    planTipo: s.plan?.tipo,
    clases: s.clasesRestantes,
    resumen: s.estado.resumen,
  }
}
