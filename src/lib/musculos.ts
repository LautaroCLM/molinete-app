import { ejercicioPorNombre, type MusculoId } from "@/lib/catalogo-ejercicios"

export type SeriesPorMusculo = Partial<Record<MusculoId, number>>

/**
 * Cuántas series estimulan a cada músculo. Cada serie cuenta 1 para el músculo principal del ejercicio
 * y 0,5 para los de apoyo. Los ejercicios que no están en el catálogo no se pueden asignar a un músculo.
 */
export function musculosDeEjercicios(items: { nombre: string; series: number }[]): { valores: SeriesPorMusculo; sinMusculo: number; total: number } {
  const valores: SeriesPorMusculo = {}
  let sinMusculo = 0
  let total = 0
  for (const it of items) {
    if (it.series <= 0) continue
    total += it.series
    const e = ejercicioPorNombre(it.nombre)
    if (!e) {
      sinMusculo += it.series
      continue
    }
    valores[e.musculo] = (valores[e.musculo] ?? 0) + it.series
    for (const m of e.secundarios) valores[m] = (valores[m] ?? 0) + it.series * 0.5
  }
  return { valores, sinMusculo, total }
}
