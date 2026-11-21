import { musculosDeNombre, type MusculoId } from "@/lib/catalogo-ejercicios"
import { claveEjercicio } from "@/lib/ejercicios-base"

export type SeriesPorMusculo = Partial<Record<MusculoId, number>>

/** Músculo principal que el gimnasio le asignó a un ejercicio propio de su biblioteca. */
export type MusculoPropio = { nombre: string; musculo: MusculoId }

/**
 * Cuántas series estimulan a cada músculo. Cada serie cuenta 1 para el músculo principal del ejercicio
 * y 0,5 para los de apoyo. Se usa primero el catálogo de la app y, si el ejercicio no está, el músculo que
 * el gimnasio le puso en su biblioteca (solo el principal). Los demás no se pueden asignar a un músculo.
 */
export function musculosDeEjercicios(
  items: { nombre: string; series: number }[],
  propios: MusculoPropio[] = [],
): { valores: SeriesPorMusculo; sinMusculo: number; total: number } {
  const delGimnasio = new Map(propios.map((p) => [claveEjercicio(p.nombre), p.musculo]))
  const valores: SeriesPorMusculo = {}
  let sinMusculo = 0
  let total = 0
  for (const it of items) {
    if (it.series <= 0) continue
    total += it.series
    const propio = delGimnasio.get(claveEjercicio(it.nombre))
    const e = musculosDeNombre(it.nombre) ?? (propio ? { musculo: propio, secundarios: [] as MusculoId[] } : undefined)
    if (!e) {
      sinMusculo += it.series
      continue
    }
    valores[e.musculo] = (valores[e.musculo] ?? 0) + it.series
    for (const m of e.secundarios) valores[m] = (valores[m] ?? 0) + it.series * 0.5
  }
  return { valores, sinMusculo, total }
}
