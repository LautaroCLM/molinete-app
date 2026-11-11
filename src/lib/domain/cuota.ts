import { addDays, differenceInCalendarDays, setDate, addMonths, startOfDay, parseISO } from "date-fns"
import type { EstadoCuota, GymConfig, Plan, Socio } from "@/types/domain"

export const DIAS_AVISO_VENCIMIENTO = 7

export interface EstadoSocio {
  estado: EstadoCuota
  /** Días hasta el vencimiento (negativo si ya venció). Null si no aplica. */
  dias: number | null
  /** Texto corto para mostrar en recepción. */
  resumen: string
}

/**
 * Regla de negocio pura: estado de la cuota de un socio a una fecha.
 * Se reutiliza tal cual en la Etapa 2 (y en el check-in por QR).
 */
export function calcularEstado(
  socio: Pick<Socio, "activo" | "vencimiento" | "clasesRestantes">,
  plan: Pick<Plan, "tipo"> | undefined,
  config: Pick<GymConfig, "diasGracia">,
  hoy: Date = new Date(),
): EstadoSocio {
  if (!socio.activo) return { estado: "inactivo", dias: null, resumen: "Inactivo" }

  if (plan?.tipo === "por_clase") {
    return { estado: "por_clase", dias: null, resumen: "Paga por clase" }
  }

  if (plan?.tipo === "paquete") {
    const restantes = socio.clasesRestantes ?? 0
    if (restantes <= 0) return { estado: "vencido", dias: null, resumen: "Sin clases disponibles" }
    if (restantes <= 2)
      return {
        estado: "por_vencer",
        dias: null,
        resumen: `Le ${restantes === 1 ? "queda 1 clase" : `quedan ${restantes} clases`}`,
      }
    return { estado: "al_dia", dias: null, resumen: `Le quedan ${restantes} clases` }
  }

  if (!socio.vencimiento) return { estado: "vencido", dias: null, resumen: "Sin pagos registrados" }

  const dias = differenceInCalendarDays(parseISO(socio.vencimiento), startOfDay(hoy))

  if (dias > DIAS_AVISO_VENCIMIENTO) return { estado: "al_dia", dias, resumen: `Vence en ${dias} días` }
  if (dias > 1) return { estado: "por_vencer", dias, resumen: `Vence en ${dias} días` }
  if (dias === 1) return { estado: "por_vencer", dias, resumen: "Vence mañana" }
  if (dias === 0) return { estado: "por_vencer", dias, resumen: "Vence hoy" }

  const vencidoHace = -dias
  const textoHace = `Venció hace ${vencidoHace} ${vencidoHace === 1 ? "día" : "días"}`
  if (vencidoHace <= config.diasGracia) {
    return { estado: "en_gracia", dias, resumen: `${textoHace}, está en días de gracia` }
  }
  return { estado: "vencido", dias, resumen: textoHace }
}

/**
 * Calcula hasta cuándo queda paga la cuota al cobrar un plan.
 * Si la cuota sigue vigente, el nuevo período arranca desde el vencimiento actual.
 */
export function calcularNuevoVencimiento(
  plan: Pick<Plan, "tipo" | "duracionDias">,
  config: Pick<GymConfig, "vencimiento">,
  vencimientoActual: string | null,
  fechaPago: Date = new Date(),
): Date | null {
  if (plan.tipo === "por_clase" || plan.tipo === "paquete") return null

  const hoy = startOfDay(fechaPago)
  const actual = vencimientoActual ? parseISO(vencimientoActual) : null
  const base = actual && actual > hoy ? actual : hoy

  if (plan.tipo === "mensual" && config.vencimiento.tipo === "dia_fijo") {
    const candidato = setDate(base, config.vencimiento.dia)
    return candidato > base ? candidato : setDate(addMonths(base, 1), config.vencimiento.dia)
  }

  const dias =
    plan.tipo === "mensual" && config.vencimiento.tipo === "dias_desde_pago"
      ? config.vencimiento.dias
      : (plan.duracionDias ?? 1)
  return addDays(base, dias)
}
