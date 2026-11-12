import "server-only"
import ExcelJS from "exceljs"

export type TipoColumna = "texto" | "pesos" | "numero" | "fecha" | "fechaHora"

export interface ColumnaExcel {
  titulo: string
  tipo?: TipoColumna
  ancho?: number
}

const FORMATOS: Record<TipoColumna, string | undefined> = {
  texto: undefined,
  pesos: '"$" #,##0.00',
  numero: "#,##0",
  fecha: "dd/mm/yyyy",
  fechaHora: "dd/mm/yyyy hh:mm",
}

const ZONA = "America/Argentina/Buenos_Aires"

/** Excel no maneja zonas horarias: se guarda la hora local de Argentina "tal cual" (como UTC). */
export function aFechaExcel(iso: string | null | undefined, conHora = false): Date | null {
  if (!iso) return null
  if (!conHora && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m, d] = iso.split("-").map(Number)
    return new Date(Date.UTC(a, m - 1, d))
  }
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso))
  const g = (t: string) => Number(partes.find((p) => p.type === t)?.value)
  return conHora ? new Date(Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"))) : new Date(Date.UTC(g("year"), g("month") - 1, g("day")))
}

export interface HojaExcel {
  nombre: string
  columnas: ColumnaExcel[]
  filas: (string | number | boolean | Date | null)[][]
  /** Filas al pie (por ejemplo totales), ya formateadas igual que las columnas. */
  pie?: (string | number | Date | null)[]
}

/** Arma un .xlsx prolijo: encabezado verde, fila fija, filtros y anchos razonables. */
export async function armarLibro(titulo: string, hojas: HojaExcel[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook()
  libro.creator = "Molinete"
  libro.title = titulo
  libro.created = new Date()

  for (const h of hojas) {
    const hoja = libro.addWorksheet(h.nombre.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] })
    hoja.columns = h.columnas.map((c) => ({
      header: c.titulo,
      width: c.ancho ?? (c.tipo === "fechaHora" ? 18 : c.tipo === "pesos" ? 16 : c.tipo === "fecha" ? 13 : c.tipo === "numero" ? 12 : 22),
      style: { numFmt: FORMATOS[c.tipo ?? "texto"], alignment: { vertical: "middle", horizontal: c.tipo === "pesos" || c.tipo === "numero" ? "right" : "left" } },
    }))
    h.filas.forEach((f) => hoja.addRow(f))

    const cabecera = hoja.getRow(1)
    cabecera.height = 22
    cabecera.eachCell((celda) => {
      celda.font = { bold: true, color: { argb: "FFFFFFFF" } }
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F7A42" } }
      celda.alignment = { vertical: "middle", horizontal: "left" }
    })
    if (h.filas.length > 0) hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columnas.length } }

    if (h.pie) {
      const fila = hoja.addRow(h.pie)
      fila.font = { bold: true }
      fila.eachCell((celda) => {
        celda.border = { top: { style: "thin", color: { argb: "FF999999" } } }
      })
    }
  }

  return Buffer.from(await libro.xlsx.writeBuffer())
}
