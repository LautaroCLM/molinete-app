import { format, formatDistanceToNowStrict, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})

const arsCompact = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const numero = new Intl.NumberFormat("es-AR")

export function pesos(monto: number) {
  return ars.format(monto)
}

/** $ 1,2 M — para ejes de gráficos. */
export function pesosCorto(monto: number) {
  return `$ ${arsCompact.format(monto)}`
}

export function num(n: number) {
  return numero.format(n)
}

function toDate(d: string | Date) {
  return typeof d === "string" ? parseISO(d) : d
}

/** 10/11/2026 */
export function fecha(d: string | Date) {
  return format(toDate(d), "dd/MM/yyyy")
}

/** 10 nov */
export function fechaCorta(d: string | Date) {
  return format(toDate(d), "d MMM", { locale: es })
}

/** martes 10 de noviembre */
export function fechaLarga(d: string | Date) {
  return format(toDate(d), "EEEE d 'de' MMMM", { locale: es })
}

/** 18:45 */
export function hora(d: string | Date) {
  return format(toDate(d), "HH:mm")
}

/** 10/11 18:45 */
export function fechaHora(d: string | Date) {
  return format(toDate(d), "dd/MM HH:mm")
}

export function hace(d: string | Date) {
  return formatDistanceToNowStrict(toDate(d), { locale: es, addSuffix: true })
}

/** 30.123.456 */
export function dni(valor: string) {
  return valor.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function nombreCompleto(p: { nombre: string; apellido: string }) {
  return `${p.nombre} ${p.apellido}`
}

export function iniciales(p: { nombre: string; apellido: string }) {
  return `${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`.toUpperCase()
}

/** Normaliza para búsqueda: minúsculas, sin acentos ni puntos. */
export function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\./g, "")
    .trim()
}
