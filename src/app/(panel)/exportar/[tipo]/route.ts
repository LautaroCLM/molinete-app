import { endOfMonth, format, startOfDay, startOfMonth, subMonths } from "date-fns"
import { armarLibro, aFechaExcel, type HojaExcel } from "@/lib/exportar"
import { getAsistencias, getMovimientos, getProductos, getSesion, getSocios, type FiltroSocios } from "@/lib/data"
import { puede } from "@/lib/permissions"
import { CATEGORIAS_MOVIMIENTO, CATEGORIAS_PRODUCTO, ESTADOS_CUOTA, MEDIOS_PAGO } from "@/lib/labels"

export const dynamic = "force-dynamic"

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const FILTROS: FiltroSocios[] = ["todos", "activos", "por_vencer", "vencidos", "inactivos"]

function rango(param: string | null): { desde?: Date; hasta?: Date; etiqueta: string } {
  const hoy = new Date()
  switch (param) {
    case "hoy":
      return { desde: startOfDay(hoy), etiqueta: "hoy" }
    case "mes_anterior": {
      const ant = subMonths(hoy, 1)
      return { desde: startOfMonth(ant), hasta: endOfMonth(ant), etiqueta: "mes-anterior" }
    }
    case "todo":
      return { desde: new Date(0), etiqueta: "completo" }
    default:
      return { desde: startOfMonth(hoy), etiqueta: "este-mes" }
  }
}

const slug = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

/** Exporta a Excel. Solo el dueño: incluye montos, costos y datos personales de los socios. */
export async function GET(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params
  const { usuario, gym } = await getSesion()
  if (!puede(usuario.rol, "reportes.ver")) return new Response("No tenés permiso para exportar.", { status: 403 })

  const url = new URL(req.url)
  const hoy = format(new Date(), "yyyy-MM-dd")
  let nombre = ""
  let hojas: HojaExcel[]

  if (tipo === "socios") {
    const filtroParam = url.searchParams.get("filtro") as FiltroSocios
    const filtro = FILTROS.includes(filtroParam) ? filtroParam : "todos"
    const socios = await getSocios(filtro)
    nombre = `socios-${filtro}`
    hojas = [
      {
        nombre: "Socios",
        columnas: [
          { titulo: "Apellido" },
          { titulo: "Nombre" },
          { titulo: "DNI", ancho: 13 },
          { titulo: "Teléfono", ancho: 16 },
          { titulo: "Email", ancho: 28 },
          { titulo: "Plan" },
          { titulo: "Estado", ancho: 18 },
          { titulo: "Vence", tipo: "fecha" },
          { titulo: "Clases restantes", tipo: "numero" },
          { titulo: "Alta", tipo: "fecha" },
          { titulo: "Última asistencia", tipo: "fechaHora" },
        ],
        filas: socios.map((s) => [
          s.apellido,
          s.nombre,
          s.dni,
          s.telefono,
          s.email,
          s.plan?.nombre ?? "Sin plan",
          ESTADOS_CUOTA[s.estado.estado],
          aFechaExcel(s.vencimiento),
          s.clasesRestantes,
          aFechaExcel(s.fechaAlta),
          aFechaExcel(s.ultimaAsistencia, true),
        ]),
      },
    ]
  } else if (tipo === "caja") {
    const r = rango(url.searchParams.get("rango"))
    const movs = await getMovimientos({ desde: r.desde, hasta: r.hasta, completo: true })
    nombre = `caja-${r.etiqueta}`
    const vigentes = movs.filter((m) => !m.anulacion)
    const ingresos = vigentes.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0)
    const egresos = vigentes.filter((m) => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0)
    hojas = [
      {
        nombre: "Movimientos",
        columnas: [
          { titulo: "Fecha", tipo: "fechaHora" },
          { titulo: "Tipo", ancho: 11 },
          { titulo: "Categoría", ancho: 22 },
          { titulo: "Descripción", ancho: 40 },
          { titulo: "Medio", ancho: 16 },
          { titulo: "Monto", tipo: "pesos" },
          { titulo: "Estado", ancho: 11 },
          { titulo: "Motivo de anulación", ancho: 30 },
          { titulo: "Registró" },
        ],
        filas: [...movs].reverse().map((m) => [
          aFechaExcel(m.fecha, true),
          m.tipo === "ingreso" ? "Ingreso" : "Egreso",
          CATEGORIAS_MOVIMIENTO[m.categoria].label,
          m.descripcion,
          MEDIOS_PAGO[m.medio],
          m.monto,
          m.anulacion ? "Anulado" : "Vigente",
          m.anulacion?.motivo ?? "",
          m.usuario ? `${m.usuario.nombre} ${m.usuario.apellido}` : "",
        ]),
      },
      {
        nombre: "Resumen",
        columnas: [{ titulo: "Concepto", ancho: 28 }, { titulo: "Total", tipo: "pesos" }],
        filas: [
          ["Ingresos (sin anulados)", ingresos],
          ["Egresos (sin anulados)", egresos],
        ],
        pie: ["Balance", ingresos - egresos],
      },
    ]
  } else if (tipo === "inventario") {
    const productos = await getProductos()
    nombre = "inventario"
    const valor = productos.filter((p) => p.activo).reduce((s, p) => s + p.costo * p.stock, 0)
    hojas = [
      {
        nombre: "Inventario",
        columnas: [
          { titulo: "Producto", ancho: 30 },
          { titulo: "Categoría", ancho: 18 },
          { titulo: "Costo", tipo: "pesos" },
          { titulo: "Precio", tipo: "pesos" },
          { titulo: "Stock", tipo: "numero" },
          { titulo: "Stock mínimo", tipo: "numero" },
          { titulo: "Valor en stock (costo)", tipo: "pesos", ancho: 22 },
          { titulo: "Estado", ancho: 14 },
        ],
        filas: productos.map((p) => [
          p.nombre,
          CATEGORIAS_PRODUCTO[p.categoria],
          p.costo,
          p.precio,
          p.stock,
          p.stockMinimo,
          p.costo * p.stock,
          !p.activo ? "Inactivo" : p.stock <= p.stockMinimo ? "Stock bajo" : "Normal",
        ]),
        pie: ["Total", "", "", "", "", "", valor, ""],
      },
    ]
  } else if (tipo === "asistencias") {
    const r = rango(url.searchParams.get("rango"))
    const llegadas = await getAsistencias({ desde: r.desde, hasta: r.hasta, completo: true })
    nombre = `asistencias-${r.etiqueta}`
    hojas = [
      {
        nombre: "Asistencias",
        columnas: [
          { titulo: "Fecha", tipo: "fechaHora" },
          { titulo: "Apellido" },
          { titulo: "Nombre" },
          { titulo: "DNI", ancho: 13 },
          { titulo: "Origen", ancho: 14 },
          { titulo: "Registró" },
        ],
        filas: llegadas.map((a) => [
          aFechaExcel(a.fecha, true),
          a.socio.apellido,
          a.socio.nombre,
          a.socio.dni,
          a.origen === "qr" ? "Código QR" : "Recepción",
          a.usuario ? `${a.usuario.nombre} ${a.usuario.apellido}` : "",
        ]),
      },
    ]
  } else {
    return new Response("Exportación desconocida.", { status: 404 })
  }

  const buffer = await armarLibro(`${gym.nombre} · ${nombre}`, hojas)
  const archivo = `${slug(gym.nombre)}-${nombre}-${hoy}.xlsx`
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "no-store",
    },
  })
}
