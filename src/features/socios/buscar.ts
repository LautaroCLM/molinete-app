import { normalizar } from "@/lib/format"
import type { SocioIndice } from "@/lib/data"

/**
 * Búsqueda instantánea en memoria por nombre, apellido o DNI.
 * Con ~2.000 socios por gimnasio corre en menos de 1 ms por tecla.
 * Prioriza: DNI que empieza igual > apellido/nombre que empieza igual > contiene.
 */
export function buscarSocios(indice: SocioIndice[], consulta: string, limite = 8): SocioIndice[] {
  const q = normalizar(consulta)
  if (!q) return []
  const soloNumeros = /^\d+$/.test(q)
  const palabras = q.split(/\s+/)

  const puntuados: [SocioIndice, number][] = []
  for (const s of indice) {
    let puntaje = 0
    if (soloNumeros) {
      if (s.dni.startsWith(q)) puntaje = 3
      else if (s.dni.includes(q)) puntaje = 1
    } else {
      const nombre = normalizar(s.nombre)
      const apellido = normalizar(s.apellido)
      const completo = `${nombre} ${apellido} ${apellido} ${nombre}`
      if (!palabras.every((p) => completo.includes(p))) continue
      puntaje = palabras.some((p) => apellido.startsWith(p) || nombre.startsWith(p)) ? 2 : 1
      if (!s.estado.startsWith("inactivo")) puntaje += 0.5
    }
    if (puntaje > 0) puntuados.push([s, puntaje])
  }
  return puntuados
    .sort((a, b) => b[1] - a[1] || a[0].apellido.localeCompare(b[0].apellido, "es"))
    .slice(0, limite)
    .map(([s]) => s)
}
