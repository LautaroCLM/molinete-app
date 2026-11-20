/** Utilidades del registro de entrenamientos (puras: sirven en el celular y en pruebas). */

/** 1RM estimado (Epley). Sirve para comparar series con distinto peso y repeticiones. */
export function e1rm(peso: number, reps: number) {
  return peso * (1 + reps / 30)
}

/** Cantidad de series a mostrar según el texto de la rutina ("4", "3-4", "4 series"). Mínimo 1, máximo 12; por defecto 3. */
export function cantidadSeries(texto: string): number {
  const n = parseInt(texto.match(/\d+/)?.[0] ?? "", 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 12) : 3
}

/** Primer número de las repeticiones sugeridas ("8-10" → 8), o null. */
export function repsSugeridas(texto: string): number | null {
  const n = parseInt(texto.match(/\d+/)?.[0] ?? "", 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Segundos de descanso a partir del texto ("90 s", "1:30", "2 min", "90"). Por defecto 90; entre 10 s y 10 min. */
export function segundosDescanso(texto: string): number {
  const t = texto.toLowerCase().trim()
  if (!t) return 90
  let seg: number | null = null
  const mmss = t.match(/(\d+)\s*:\s*(\d{1,2})/)
  const min = t.match(/(\d+(?:[.,]\d+)?)\s*(?:min|m\b)/)
  const num = t.match(/(\d+(?:[.,]\d+)?)/)
  if (mmss) seg = parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10)
  else if (min) seg = Math.round(parseFloat(min[1].replace(",", ".")) * 60)
  else if (num) {
    const n = parseFloat(num[1].replace(",", "."))
    seg = n <= 10 && !/s/.test(t) ? Math.round(n * 60) : Math.round(n) // "2" = 2 min; "90" o "90 s" = segundos
  }
  return seg === null ? 90 : Math.min(Math.max(seg, 10), 600)
}

/** "75" · "62,5" → 62.5 ; vacío o inválido → null */
export function aNumero(valor: string): number | null {
  const n = parseFloat(valor.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/** mm:ss */
export function reloj(segundos: number) {
  const s = Math.max(0, Math.round(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
