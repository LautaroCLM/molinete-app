/**
 * Datos de ejemplo (Etapa 1). Se generan una sola vez, en forma determinística,
 * relativos al día de hoy, para que el molde se vea "vivo".
 * En la Etapa 2 este archivo deja de usarse: la capa `lib/data` lee de Supabase.
 */
import { addDays, addMinutes, setHours, setMinutes, startOfDay, subDays, getDay } from "date-fns"
import type {
  Asistencia,
  Caja,
  CategoriaMovimiento,
  Gym,
  MedioPago,
  Movimiento,
  MovimientoStock,
  Pago,
  Plan,
  Producto,
  RegistroAuditoria,
  Socio,
  Usuario,
} from "@/types/domain"

// ---------- Utilidades de azar con semilla ----------
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261110)
const entre = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const elegir = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const chance = (p: number) => rand() < p
function ponderado<T>(opciones: readonly (readonly [T, number])[]): T {
  const total = opciones.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [v, w] of opciones) {
    r -= w
    if (r <= 0) return v
  }
  return opciones[opciones.length - 1][0]
}

let contador = 0
const id = (prefijo: string) => `${prefijo}_${(++contador).toString(36).padStart(5, "0")}`

// ---------- Fechas de referencia ----------
export const AHORA = new Date()
const HOY = startOfDay(AHORA)
const DIAS_HISTORIA = 75
const enHora = (dia: Date, h: number, m: number) => setMinutes(setHours(dia, h), m)

// ---------- Gimnasio ----------
export const GYM_ID = "gym_fuerzasur"

export const gym: Gym = {
  id: GYM_ID,
  nombre: "Fuerza Sur",
  direccion: "Av. Mitre 2350",
  localidad: "Avellaneda, Buenos Aires",
  telefono: "11 4222-8190",
  email: "hola@fuerzasur.com.ar",
  logoUrl: null,
  config: {
    vencimiento: { tipo: "dias_desde_pago", dias: 30 },
    diasGracia: 5,
    diasInactividad: 15,
  },
}

// ---------- Usuarios ----------
export const usuarios: Usuario[] = [
  {
    id: "usr_martin",
    gym_id: GYM_ID,
    nombre: "Martín",
    apellido: "Ferreyra",
    email: "martin@fuerzasur.com.ar",
    rol: "dueno",
    activo: true,
    invitacionPendiente: false,
    ultimoAcceso: addMinutes(AHORA, -12).toISOString(),
  },
  {
    id: "usr_sofia",
    gym_id: GYM_ID,
    nombre: "Sofía",
    apellido: "Benítez",
    email: "sofia.benitez@gmail.com",
    rol: "recepcionista",
    activo: true,
    invitacionPendiente: false,
    ultimoAcceso: addMinutes(AHORA, -3).toISOString(),
  },
  {
    id: "usr_lucas",
    gym_id: GYM_ID,
    nombre: "Lucas",
    apellido: "Giménez",
    email: "lucasgimenez.97@hotmail.com",
    rol: "recepcionista",
    activo: true,
    invitacionPendiente: false,
    ultimoAcceso: subDays(enHora(HOY, 22, 4), 1).toISOString(),
  },
  {
    id: "usr_carla",
    gym_id: GYM_ID,
    nombre: "Carla",
    apellido: "Ríos",
    email: "carla.rios@gmail.com",
    rol: "recepcionista",
    activo: true,
    invitacionPendiente: true,
    ultimoAcceso: null,
  },
  {
    id: "usr_nahuel",
    gym_id: GYM_ID,
    nombre: "Nahuel",
    apellido: "Ortiz",
    email: "nahue.ortiz@gmail.com",
    rol: "recepcionista",
    activo: false,
    invitacionPendiente: false,
    ultimoAcceso: subDays(HOY, 48).toISOString(),
  },
]

// ---------- Planes ----------
export const planes: Plan[] = [
  { id: "pln_libre", gym_id: GYM_ID, nombre: "Mensual libre", tipo: "mensual", precio: 38000, duracionDias: 30, cantidadClases: null, activo: true },
  { id: "pln_3x", gym_id: GYM_ID, nombre: "Mensual 3 veces por semana", tipo: "mensual", precio: 31000, duracionDias: 30, cantidadClases: null, activo: true },
  { id: "pln_clase", gym_id: GYM_ID, nombre: "Clase suelta", tipo: "por_clase", precio: 6500, duracionDias: null, cantidadClases: null, activo: true },
  { id: "pln_pack8", gym_id: GYM_ID, nombre: "Pack 8 clases", tipo: "paquete", precio: 40000, duracionDias: null, cantidadClases: 8, activo: true },
  { id: "pln_semanal", gym_id: GYM_ID, nombre: "Pase semanal", tipo: "semanal", precio: 14000, duracionDias: 7, cantidadClases: null, activo: false },
]
const planPorId = new Map(planes.map((p) => [p.id, p]))

// ---------- Socios ----------
const NOMBRES_F = ["Lucía", "Valentina", "Camila", "Florencia", "Agustina", "Micaela", "Julieta", "Rocío", "Milagros", "Belén", "Antonella", "Sol", "Carolina", "Paula", "Daniela", "Romina", "Natalia", "Gabriela", "Celeste", "Marina", "Josefina", "Abril", "Martina", "Delfina", "Lorena"]
const NOMBRES_M = ["Juan", "Santiago", "Matías", "Nicolás", "Facundo", "Tomás", "Gonzalo", "Federico", "Lautaro", "Joaquín", "Agustín", "Franco", "Ezequiel", "Leandro", "Hernán", "Pablo", "Diego", "Maximiliano", "Ignacio", "Rodrigo", "Damián", "Sebastián", "Marcos", "Bruno", "Emiliano"]
const APELLIDOS = ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "García", "Sánchez", "Romero", "Sosa", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina", "Suárez", "Herrera", "Aguirre", "Pereyra", "Gutiérrez", "Giménez", "Molina", "Silva", "Castro", "Rojas", "Ortiz", "Núñez", "Luna", "Juárez", "Cabrera", "Ríos", "Ferreyra", "Godoy", "Morales", "Domínguez", "Quiroga", "Vera", "Coronel", "Ledesma", "Vázquez", "Paz", "Ojeda", "Ponce", "Villalba", "Cardozo"]
const OBSERVACIONES = [
  "",
  "",
  "",
  "",
  "Lesión de rodilla derecha, evitar sentadilla profunda.",
  "Viene con la hermana.",
  "Hipertensión controlada. Tiene apto médico al día.",
  "Prefiere que le escriban por WhatsApp.",
  "Entrena para competencia de powerlifting.",
  "Pidió rutina de rehabilitación de hombro.",
  "Paga siempre por transferencia.",
]
const DOMINIOS = ["gmail.com", "gmail.com", "gmail.com", "hotmail.com", "yahoo.com.ar", "outlook.com"]

function sinAcentos(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

interface SocioSemilla {
  socio: Socio
  /** Visitas por semana aproximadas. */
  frecuencia: number
  /** Si dejó de venir, desde hace cuántos días. */
  ausenteDesde: number | null
}

const semillas: SocioSemilla[] = []
const usados = new Set<string>()
for (let i = 0; i < 148; i++) {
  const mujer = chance(0.48)
  let nombre = "",
    apellido = ""
  do {
    nombre = elegir(mujer ? NOMBRES_F : NOMBRES_M)
    apellido = elegir(APELLIDOS)
  } while (usados.has(nombre + apellido))
  usados.add(nombre + apellido)

  const planId = ponderado([
    ["pln_libre", 52],
    ["pln_3x", 22],
    ["pln_clase", 18],
    ["pln_pack8", 6],
    ["pln_semanal", 2],
  ] as const)
  const plan = planPorId.get(planId)!
  const activo = !chance(0.07)
  const antiguedad = entre(5, 900)
  const fechaAlta = subDays(HOY, antiguedad)

  // Vencimiento: la mayoría al día, algunos por vencer, algunos vencidos.
  let vencimiento: string | null = null
  if (plan.tipo === "mensual" || plan.tipo === "semanal") {
    const offset = ponderado([
      [entre(8, 29), 58],
      [entre(0, 7), 16],
      [-entre(1, 5), 9],
      [-entre(6, 45), 17],
    ] as const)
    const venc = addDays(HOY, Math.min(offset, antiguedad + 30))
    vencimiento = venc.toISOString()
  }

  const ausente = activo && chance(0.12) ? entre(16, 50) : null
  const frecuencia = plan.tipo === "por_clase" ? entre(1, 2) : plan.id === "pln_3x" ? 3 : entre(2, 5)

  const socio: Socio = {
    id: id("soc"),
    gym_id: GYM_ID,
    nombre,
    apellido,
    dni: String(entre(mujer ? 28 : 25, 46) * 1_000_000 + entre(0, 999_999)),
    telefono: `11 ${entre(2000, 6999)}-${entre(1000, 9999)}`,
    email: chance(0.85) ? `${sinAcentos(nombre)}.${sinAcentos(apellido)}${chance(0.4) ? entre(70, 99) : ""}@${elegir(DOMINIOS)}` : "",
    fechaAlta: fechaAlta.toISOString(),
    observaciones: elegir(OBSERVACIONES),
    planId,
    vencimiento,
    clasesRestantes: plan.tipo === "paquete" ? entre(0, 8) : null,
    activo,
    ultimaAsistencia: null,
  }
  semillas.push({ socio, frecuencia, ausenteDesde: ausente })
}

// Algunos socios "conocidos" para la demo
const demo = semillas[0].socio
Object.assign(demo, { nombre: "Lucía", apellido: "Fernández", dni: "38456123", email: "lucia.fernandez@gmail.com", planId: "pln_libre", activo: true, vencimiento: addDays(HOY, 3).toISOString(), observaciones: "Viene con la hermana." })
semillas[0].ausenteDesde = null
const demo2 = semillas[1].socio
Object.assign(demo2, { nombre: "Juan", apellido: "Pérez", dni: "40112908", email: "juanperez.94@hotmail.com", planId: "pln_clase", activo: true, vencimiento: null })
semillas[1].ausenteDesde = null
const demo3 = semillas[2].socio
Object.assign(demo3, { nombre: "Matías", apellido: "Gómez", dni: "35890441", email: "mati.gomez@gmail.com", planId: "pln_libre", activo: true, vencimiento: subDays(HOY, 12).toISOString() })
semillas[2].ausenteDesde = null

export const socios: Socio[] = semillas.map((s) => s.socio)

// ---------- Cajas (dos turnos por día) ----------
export const cajas: Caja[] = []
const cajaDe = new Map<string, Caja>() // clave: yyyy-mm-dd|turno

function claveDia(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

for (let i = DIAS_HISTORIA; i >= 0; i--) {
  const dia = subDays(HOY, i)
  const domingo = getDay(dia) === 0
  if (domingo) continue
  const sabado = getDay(dia) === 6
  const turnos: ["m" | "t", string, number, number][] = sabado
    ? [["m", "usr_sofia", 8, 14]]
    : [
        ["m", "usr_sofia", 7, 14],
        ["t", "usr_lucas", 14, 22],
      ]
  for (const [turno, usuarioId, desde, hasta] of turnos) {
    const esHoy = i === 0
    if (esHoy && turno === "t") continue
    const apertura = enHora(dia, desde, entre(0, 6))
    if (esHoy && apertura > AHORA) continue
    const abierta = (esHoy && turno === "m") || (i === 1 && turno === "t")
    const caja: Caja = {
      id: id("caj"),
      gym_id: GYM_ID,
      usuarioId,
      apertura: apertura.toISOString(),
      cierre: abierta ? null : enHora(dia, hasta, entre(0, 12)).toISOString(),
      montoInicial: turno === "m" ? 20000 : 15000,
      montoContado: null,
      observaciones: "",
    }
    cajas.push(caja)
    cajaDe.set(`${claveDia(dia)}|${turno}`, caja)
  }
}

function cajaPara(fecha: Date): Caja | undefined {
  const k = claveDia(fecha)
  const hoyEsDia = claveDia(HOY) === k
  if (hoyEsDia) return cajaDe.get(`${k}|m`)
  return fecha.getHours() >= 14 ? (cajaDe.get(`${k}|t`) ?? cajaDe.get(`${k}|m`)) : cajaDe.get(`${k}|m`)
}

// ---------- Movimientos, pagos, asistencias ----------
export const movimientos: Movimiento[] = []
export const pagos: Pago[] = []
export const asistencias: Asistencia[] = []
export const productos: Producto[] = []
export const movimientosStock: MovimientoStock[] = []
export const auditoria: RegistroAuditoria[] = []

function medioAzar(): MedioPago {
  return ponderado([
    ["efectivo", 38],
    ["transferencia", 30],
    ["mercado_pago", 24],
    ["tarjeta", 8],
  ] as const)
}

function registrarMovimiento(
  fecha: Date,
  tipo: "ingreso" | "egreso",
  categoria: CategoriaMovimiento,
  monto: number,
  medio: MedioPago,
  descripcion: string,
  administracion = false,
): Movimiento | null {
  const caja = administracion ? null : cajaPara(fecha)
  if (!caja && !administracion) return null
  const m: Movimiento = {
    id: id("mov"),
    gym_id: GYM_ID,
    cajaId: caja?.id ?? null,
    tipo,
    monto,
    medio,
    categoria,
    descripcion,
    fecha: fecha.toISOString(),
    usuarioId: caja?.usuarioId ?? "usr_martin",
    anulacion: null,
  }
  movimientos.push(m)
  return m
}

// Horario de llegada: picos a la mañana temprano y después del trabajo.
function horaLlegada(sabado: boolean): [number, number] {
  if (sabado) return [entre(8, 12), entre(0, 59)]
  const h = ponderado([
    [7, 9],
    [8, 11],
    [9, 7],
    [10, 5],
    [11, 4],
    [12, 4],
    [13, 3],
    [14, 2],
    [15, 3],
    [16, 5],
    [17, 9],
    [18, 14],
    [19, 15],
    [20, 11],
    [21, 4],
  ] as const)
  return [h, entre(0, 59)]
}

// Pagos de cuotas mensuales históricos (hacia atrás desde el vencimiento actual)
for (const { socio } of semillas) {
  const plan = planPorId.get(socio.planId)!
  if (!socio.vencimiento || !(plan.tipo === "mensual" || plan.tipo === "semanal")) continue
  let venc = new Date(socio.vencimiento)
  const dur = plan.duracionDias ?? 30
  for (let k = 0; k < 4; k++) {
    const fechaPago = subDays(venc, dur)
    if (fechaPago > AHORA) {
      venc = fechaPago
      continue
    }
    if (fechaPago < subDays(HOY, DIAS_HISTORIA) || fechaPago < new Date(socio.fechaAlta)) break
    const [h, m] = horaLlegada(getDay(fechaPago) === 6)
    let cuando = enHora(startOfDay(fechaPago), h, m)
    if (getDay(cuando) === 0) cuando = addDays(cuando, 1)
    if (cuando > AHORA) cuando = addMinutes(AHORA, -entre(5, 200))
    const medio = medioAzar()
    const mov = registrarMovimiento(cuando, "ingreso", "cuota", plan.precio, medio, `${plan.nombre} · ${socio.nombre} ${socio.apellido}`)
    if (mov) {
      pagos.push({
        id: id("pag"),
        gym_id: GYM_ID,
        socioId: socio.id,
        planId: plan.id,
        monto: plan.precio,
        medio,
        fecha: cuando.toISOString(),
        usuarioId: mov.usuarioId,
        movimientoId: mov.id,
        vencimientoHasta: venc.toISOString(),
      })
    }
    venc = fechaPago
  }
}

// Asistencias día por día
const activos = semillas.filter((s) => s.socio.activo)
for (let i = DIAS_HISTORIA; i >= 0; i--) {
  const dia = subDays(HOY, i)
  const dow = getDay(dia)
  if (dow === 0) continue
  const sabado = dow === 6
  for (const s of activos) {
    if (s.ausenteDesde !== null && i < s.ausenteDesde) continue
    if (new Date(s.socio.fechaAlta) > dia) continue
    const p = (s.frecuencia / 6) * (sabado ? 0.5 : 1) * (dow === 5 ? 0.85 : 1)
    if (!chance(p)) continue
    const [h, m] = horaLlegada(sabado)
    const cuando = enHora(dia, h, m)
    if (cuando > AHORA) continue
    const caja = cajaPara(cuando)
    const qr = chance(0.15)
    asistencias.push({
      id: id("asi"),
      gym_id: GYM_ID,
      socioId: s.socio.id,
      fecha: cuando.toISOString(),
      origen: qr ? "qr" : "recepcion",
      usuarioId: qr ? null : (caja?.usuarioId ?? null),
    })
    const plan = planPorId.get(s.socio.planId)!
    if (plan.tipo === "por_clase" && chance(0.92)) {
      const medio = medioAzar()
      const mov = registrarMovimiento(addMinutes(cuando, 1), "ingreso", "clase", plan.precio, medio, `Clase suelta · ${s.socio.nombre} ${s.socio.apellido}`)
      if (mov)
        pagos.push({
          id: id("pag"),
          gym_id: GYM_ID,
          socioId: s.socio.id,
          planId: plan.id,
          monto: plan.precio,
          medio,
          fecha: mov.fecha,
          usuarioId: mov.usuarioId,
          movimientoId: mov.id,
          vencimientoHasta: null,
        })
    }
  }
}
asistencias.sort((a, b) => a.fecha.localeCompare(b.fecha))
for (const a of asistencias) {
  const s = socios.find((x) => x.id === a.socioId)
  if (s) s.ultimaAsistencia = a.fecha
}
// La socia demo vino hace un rato
const ultimaDemo = addMinutes(AHORA, -25)
if (ultimaDemo > HOY) {
  asistencias.push({ id: id("asi"), gym_id: GYM_ID, socioId: demo.id, fecha: ultimaDemo.toISOString(), origen: "recepcion", usuarioId: "usr_sofia" })
  demo.ultimaAsistencia = ultimaDemo.toISOString()
}

// ---------- Productos ----------
const CATALOGO: Omit<Producto, "id" | "gym_id" | "stock" | "activo">[] = [
  { nombre: "Agua mineral 500 ml", categoria: "bebidas", costo: 450, precio: 1200, stockMinimo: 24 },
  { nombre: "Agua mineral 1,5 L", categoria: "bebidas", costo: 900, precio: 2000, stockMinimo: 12 },
  { nombre: "Powerade 500 ml", categoria: "bebidas", costo: 1300, precio: 2500, stockMinimo: 12 },
  { nombre: "Gatorade 500 ml", categoria: "bebidas", costo: 1400, precio: 2600, stockMinimo: 12 },
  { nombre: "Monster 473 ml", categoria: "bebidas", costo: 1900, precio: 3500, stockMinimo: 6 },
  { nombre: "Barrita de cereal", categoria: "snacks", costo: 420, precio: 1000, stockMinimo: 20 },
  { nombre: "Barra proteica 46 g", categoria: "snacks", costo: 1500, precio: 3000, stockMinimo: 10 },
  { nombre: "Proteína whey 1 kg", categoria: "suplementos", costo: 28000, precio: 42000, stockMinimo: 3 },
  { nombre: "Creatina 300 g", categoria: "suplementos", costo: 16000, precio: 25000, stockMinimo: 3 },
  { nombre: "Shaker 600 ml", categoria: "accesorios", costo: 3500, precio: 7000, stockMinimo: 4 },
  { nombre: "Guantes de entrenamiento", categoria: "accesorios", costo: 6500, precio: 12500, stockMinimo: 3 },
  { nombre: "Candado para locker", categoria: "accesorios", costo: 2500, precio: 5000, stockMinimo: 4 },
  { nombre: "Remera Fuerza Sur", categoria: "merchandising", costo: 7000, precio: 15000, stockMinimo: 5 },
  { nombre: "Toalla Fuerza Sur", categoria: "merchandising", costo: 5000, precio: 10000, stockMinimo: 4 },
]
const STOCK_ACTUAL = [62, 9, 18, 4, 11, 35, 7, 5, 2, 6, 3, 8, 14, 1]
CATALOGO.forEach((c, idx) => {
  productos.push({ ...c, id: id("prd"), gym_id: GYM_ID, stock: STOCK_ACTUAL[idx], activo: true })
})

// Ventas de productos e ingresos de mercadería
for (let i = DIAS_HISTORIA; i >= 0; i--) {
  const dia = subDays(HOY, i)
  if (getDay(dia) === 0) continue
  const ventas = entre(4, 12)
  for (let v = 0; v < ventas; v++) {
    const prod = ponderado(productos.map((p, idx) => [p, idx < 7 ? 10 : 1.2] as const))
    const cant = prod.categoria === "bebidas" && chance(0.2) ? 2 : 1
    const [h, m] = horaLlegada(getDay(dia) === 6)
    const cuando = enHora(dia, h, m)
    if (cuando > AHORA) continue
    const mov = registrarMovimiento(cuando, "ingreso", "venta_producto", prod.precio * cant, chance(0.55) ? "efectivo" : "mercado_pago", `${cant > 1 ? `${cant} × ` : ""}${prod.nombre}`)
    if (mov)
      movimientosStock.push({ id: id("stk"), gym_id: GYM_ID, productoId: prod.id, tipo: "venta", cantidad: -cant, fecha: mov.fecha, usuarioId: mov.usuarioId, nota: "" })
  }
  if (getDay(dia) === 2 || getDay(dia) === 5) {
    const cuando = enHora(dia, 10, entre(0, 50))
    if (cuando <= AHORA) {
      const lote = productos.filter((_, idx) => idx < 7 && chance(0.6))
      let total = 0
      for (const p of lote) {
        const cant = p.categoria === "bebidas" ? 24 : 12
        total += cant * p.costo
        movimientosStock.push({ id: id("stk"), gym_id: GYM_ID, productoId: p.id, tipo: "entrada", cantidad: cant, fecha: cuando.toISOString(), usuarioId: "usr_sofia", nota: "Reposición distribuidora" })
      }
      if (total > 0) registrarMovimiento(cuando, "egreso", "compra_mercaderia", total, "transferencia", "Distribuidora Sur Bebidas", true)
    }
  }
}
movimientosStock.push({
  id: id("stk"),
  gym_id: GYM_ID,
  productoId: productos[3].id,
  tipo: "ajuste",
  cantidad: -2,
  fecha: subDays(enHora(HOY, 9, 15), 2).toISOString(),
  usuarioId: "usr_martin",
  nota: "Dos botellas vencidas",
})

// Gastos fijos y varios
for (let i = DIAS_HISTORIA; i >= 0; i--) {
  const dia = subDays(HOY, i)
  if (getDay(dia) === 0) continue
  const d = dia.getDate()
  const cuando = enHora(dia, 11, entre(0, 59))
  if (cuando > AHORA) continue
  if (d === 1 || d === 2) {
    if (d === 1) {
      registrarMovimiento(cuando, "egreso", "alquiler", 850000, "transferencia", "Alquiler del local", true)
      registrarMovimiento(addMinutes(cuando, 5), "egreso", "sueldos", 620000, "transferencia", "Sueldo Sofía Benítez", true)
      registrarMovimiento(addMinutes(cuando, 6), "egreso", "sueldos", 620000, "transferencia", "Sueldo Lucas Giménez", true)
      registrarMovimiento(addMinutes(cuando, 8), "egreso", "sueldos", 480000, "transferencia", "Profesores de sala", true)
    }
  }
  if (d === 10) registrarMovimiento(cuando, "egreso", "servicios", entre(180000, 240000), "transferencia", "Edesur (luz)", true)
  if (d === 12) registrarMovimiento(cuando, "egreso", "servicios", 42000, "transferencia", "Internet Telecentro", true)
  if (d === 15) registrarMovimiento(cuando, "egreso", "servicios", entre(30000, 45000), "transferencia", "AySA (agua)", true)
  if (chance(0.12)) registrarMovimiento(cuando, "egreso", "gastos_varios", entre(3, 25) * 1000, "efectivo", elegir(["Artículos de limpieza", "Papel higiénico y toallas", "Lavandería toallas", "Bidones de agua", "Lamparitas"]))
  if (chance(0.03)) registrarMovimiento(cuando, "egreso", "mantenimiento", entre(40, 160) * 1000, "efectivo", elegir(["Service de cintas", "Arreglo de polea", "Tapizado de banco"]), true)
}

movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha))

// Algunos movimientos anulados (nunca se borran)
const paraAnular = movimientos.filter((m) => m.categoria === "venta_producto").slice(-40, -37)
for (const m of paraAnular) {
  m.anulacion = { fecha: addMinutes(new Date(m.fecha), 4).toISOString(), usuarioId: "usr_martin", motivo: "Cargado dos veces" }
}

// Montos contados en cajas cerradas (con alguna diferencia)
for (const c of cajas) {
  if (!c.cierre) continue
  const efectivo = movimientos
    .filter((m) => m.cajaId === c.id && m.medio === "efectivo" && !m.anulacion)
    .reduce((s, m) => s + (m.tipo === "ingreso" ? m.monto : -m.monto), 0)
  const esperado = c.montoInicial + efectivo
  const diferencia = chance(0.8) ? 0 : elegir([-500, -1000, 200, -2500, 1000])
  c.montoContado = esperado + diferencia
  if (diferencia !== 0) c.observaciones = diferencia < 0 ? "Faltante, se revisa con el turno." : "Sobrante, posible vuelto mal dado."
}

// ---------- Auditoría ----------
const recientes = movimientos.filter((m) => new Date(m.fecha) > subDays(AHORA, 3)).slice(-30)
for (const m of recientes) {
  auditoria.push({
    id: id("aud"),
    gym_id: GYM_ID,
    usuarioId: m.usuarioId,
    accion: m.categoria === "cuota" ? "Cobró cuota" : m.categoria === "clase" ? "Cobró clase" : m.categoria === "venta_producto" ? "Vendió productos" : m.tipo === "egreso" ? "Registró egreso" : "Registró ingreso",
    detalle: m.descripcion,
    fecha: m.fecha,
  })
}
for (const m of paraAnular) {
  auditoria.push({ id: id("aud"), gym_id: GYM_ID, usuarioId: "usr_martin", accion: "Anuló movimiento", detalle: `${m.descripcion} · Cargado dos veces`, fecha: m.anulacion!.fecha })
}
auditoria.push(
  { id: id("aud"), gym_id: GYM_ID, usuarioId: "usr_martin", accion: "Invitó usuario", detalle: "carla.rios@gmail.com como Recepción", fecha: subDays(AHORA, 1).toISOString() },
  { id: id("aud"), gym_id: GYM_ID, usuarioId: "usr_martin", accion: "Cambió precio de plan", detalle: "Mensual libre: $ 35.000 → $ 38.000", fecha: subDays(AHORA, 9).toISOString() },
  { id: id("aud"), gym_id: GYM_ID, usuarioId: "usr_martin", accion: "Desactivó usuario", detalle: "Nahuel Ortiz", fecha: subDays(AHORA, 47).toISOString() },
  { id: id("aud"), gym_id: GYM_ID, usuarioId: "usr_martin", accion: "Ajustó stock", detalle: "Gatorade 500 ml: −2 (dos botellas vencidas)", fecha: subDays(enHora(HOY, 9, 15), 2).toISOString() },
)
auditoria.sort((a, b) => b.fecha.localeCompare(a.fecha))
