/**
 * Verifica las reglas de seguridad (RLS y funciones) contra Supabase local.
 *
 *   npm run verificar
 *
 * Requiere haber corrido `npm run seed`. Crea un segundo gimnasio de prueba
 * para comprobar que los datos de un gimnasio no se ven desde otro.
 */
import { config } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../src/types/database"

config({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const SECRETA = process.env.SUPABASE_SECRET_KEY!
if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error("Solo contra Supabase local.")

type SB = SupabaseClient<Database>
let fallas = 0
function chequeo(nombre: string, ok: boolean, detalle = "") {
  if (!ok) fallas++
  console.log(`${ok ? "  OK  " : "  FALLA"} ${nombre}${detalle ? ` (${detalle})` : ""}`)
}

async function entrar(email: string, password = "Molinete2026"): Promise<SB> {
  const sb = createClient<Database>(URL, PUBLICA, { auth: { persistSession: false } })
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`${email}: ${error.message}`)
  return sb
}

async function main() {
  const admin = createClient<Database>(URL, SECRETA, { auth: { persistSession: false } })
  const dueno = await entrar("martin@fuerzasur.com.ar")
  const sofia = await entrar("sofia@fuerzasur.com.ar")
  const sofiaId = (await sofia.auth.getUser()).data.user!.id

  console.log("\nRecepción")
  const movs = await sofia.from("movimientos").select("usuario_id")
  chequeo("solo ve sus propios movimientos", !!movs.data?.length && movs.data.every((m) => m.usuario_id === sofiaId))
  const aud = await sofia.from("auditoria").select("id")
  chequeo("no ve la auditoría", (aud.data ?? []).length === 0)
  const tot = await sofia.rpc("resumen_movimientos", { p_desde: new Date(0).toISOString() })
  const totDueno = await dueno.rpc("resumen_movimientos", { p_desde: new Date(0).toISOString() })
  const suma = (r: typeof tot) => (r.data ?? []).reduce((s, f) => s + Number(f.total), 0)
  chequeo("los totales generales no incluyen movimientos ajenos", suma(tot) < suma(totDueno))
  const socio = (await sofia.from("socios").select("id, vencimiento").limit(1).single()).data!
  const upd = await sofia.from("socios").update({ vencimiento: "2099-01-01" }).eq("id", socio.id)
  chequeo("no puede cambiar un vencimiento a mano", !!upd.error, upd.error?.message)
  const prod = (await sofia.from("productos").select("id, stock").limit(1).single()).data!
  const stk = await sofia.from("productos").update({ stock: 999 }).eq("id", prod.id).select()
  chequeo("no puede editar productos ni stock", !!stk.error || (stk.data ?? []).length === 0)
  const plan = await sofia.from("planes").insert({ gym_id: "00000000-0000-4000-8000-000000000001", nombre: "Trucho", tipo: "mensual", precio: 1 })
  chequeo("no puede crear planes", !!plan.error)
  const mov = movs.data ? (await sofia.from("movimientos").select("id").limit(1).single()).data : null
  const anu = await sofia.rpc("anular_movimiento", { p_movimiento: mov!.id, p_motivo: "prueba" })
  chequeo("no puede anular movimientos", !!anu.error && anu.error.message.includes("SIN_PERMISO"))
  const del = await sofia.from("movimientos").delete().eq("id", mov!.id).select()
  chequeo("no puede borrar movimientos", (del.data ?? []).length === 0)
  const lucas = await entrar("lucas@fuerzasur.com.ar")
  const lucasCaja = (await lucas.from("cajas").select("id").is("cierre", null).single()).data!
  const cierre = await sofia.rpc("cerrar_caja", { p_caja: lucasCaja.id, p_monto_contado: 0 })
  chequeo("no puede cerrar la caja de otro", !!cierre.error)

  console.log("\nDueño")
  const audD = await dueno.from("auditoria").select("id")
  chequeo("ve la auditoría", (audD.data ?? []).length > 0)
  const movsD = await dueno.from("movimientos").select("usuario_id")
  chequeo("ve movimientos de todos", new Set(movsD.data?.map((m) => m.usuario_id)).size > 1)
  const sinCaja = await dueno.rpc("cobrar", { p_socio: socio.id, p_plan: (await dueno.from("planes").select("id").eq("activo", true).limit(1).single()).data!.id, p_monto: 1000, p_medio: "efectivo" })
  chequeo("no puede cobrar sin caja abierta", !!sinCaja.error && sinCaja.error.message.includes("SIN_CAJA"))

  console.log("\nOtro gimnasio")
  const email = `prueba.${Date.now()}@ejemplo.com`
  await admin.auth.admin.createUser({ email, password: "OtroGym2026", email_confirm: true })
  const otro = await entrar(email, "OtroGym2026")
  const nuevo = await admin.rpc("crear_gimnasio_admin", { p_email: email, p_nombre_gym: "Gym de prueba", p_nombre: "Ana", p_apellido: "Prueba" })
  chequeo("el administrador da de alta un gimnasio con su dueño", !nuevo.error, nuevo.error?.message)
  const ajenos = await otro.from("socios").select("id")
  chequeo("no ve socios de Fuerza Sur", (ajenos.data ?? []).length === 0)
  const ajenosMov = await otro.from("movimientos").select("id")
  chequeo("no ve movimientos de Fuerza Sur", (ajenosMov.data ?? []).length === 0)
  const asis = await otro.rpc("registrar_asistencia", { p_socio: socio.id })
  chequeo("no puede registrar asistencias en otro gimnasio", !!asis.error)
  const intruso = await otro.from("socios").update({ nombre: "Hackeado" }).eq("id", socio.id).select()
  chequeo("no puede editar socios de otro gimnasio", (intruso.data ?? []).length === 0)
  const porApp = await otro.rpc("crear_gimnasio_admin", { p_email: email, p_nombre_gym: "Por la app", p_nombre: "Ana" })
  chequeo("un usuario no puede crear gimnasios desde la app", !!porApp.error)
  const porAnon = await createClient<Database>(URL, PUBLICA, { auth: { persistSession: false } }).rpc("crear_gimnasio_admin", { p_email: email, p_nombre_gym: "Anon", p_nombre: "Ana" })
  chequeo("sin sesión tampoco", !!porAnon.error)
  const dos = await admin.rpc("crear_gimnasio_admin", { p_email: email, p_nombre_gym: "Segundo", p_nombre: "Ana" })
  chequeo("un usuario no puede tener dos gimnasios", !!dos.error && dos.error.message.includes("YA_TIENE_GIMNASIO"))
  const sinUsuario = await admin.rpc("crear_gimnasio_admin", { p_email: "no.existe@ejemplo.com", p_nombre_gym: "X", p_nombre: "Ana" })
  chequeo("no crea un gimnasio sin el usuario creado antes", !!sinUsuario.error && sinUsuario.error.message.includes("USUARIO_INEXISTENTE"))
  const anon = createClient<Database>(URL, PUBLICA, { auth: { persistSession: false } })
  const anonS = await anon.from("socios").select("id")
  chequeo("sin sesión no se ve nada", (anonS.data ?? []).length === 0)

  console.log("\nPanel de administración")
  const adminSb = await entrar("admin@molinete.test")
  chequeo("el administrador es reconocido como tal", (await adminSb.rpc("es_superadmin")).data === true)
  chequeo("el dueño de un gimnasio no es administrador", (await dueno.rpc("es_superadmin")).data === false)
  chequeo("recepción no es administrador", (await sofia.rpc("es_superadmin")).data === false)
  chequeo("sin sesión no es administrador", !(await anon.rpc("es_superadmin")).data)
  chequeo("nadie lee la lista de administradores desde la API", ((await dueno.from("plataforma_admins").select("user_id")).data ?? []).length === 0)
  const intento = await dueno.from("plataforma_admins").insert({ user_id: (await dueno.auth.getUser()).data.user!.id })
  chequeo("un usuario no puede nombrarse administrador", !!intento.error)
  const empl = await dueno.rpc("agregar_empleado_admin", { p_gym: "00000000-0000-4000-8000-000000000001", p_email: "x@ejemplo.com", p_nombre: "X" })
  chequeo("el dueño no puede crear empleados por la API", !!empl.error)
  const empA = await adminSb.rpc("agregar_empleado_admin", { p_gym: "00000000-0000-4000-8000-000000000001", p_email: "x@ejemplo.com", p_nombre: "X" })
  chequeo("ni el administrador con su sesión: solo con la clave secreta", !!empA.error)
  const gymsAdmin = await adminSb.from("gyms").select("id")
  chequeo("con su sesión el administrador no ve datos de gimnasios (el panel usa la clave del servidor)", (gymsAdmin.data ?? []).length === 0)

  console.log("\nIngreso con QR (público, sin sesión)")
  const gymDemo = (await admin.from("gyms").select("id, qr_token").eq("id", "00000000-0000-4000-8000-000000000001").single()).data!
  const tokenQR = gymDemo.qr_token
  const malo = await anon.rpc("qr_gimnasio", { p_token: "no-existe" })
  chequeo("un QR inválido no muestra ningún gimnasio", (malo.data ?? []).length === 0)
  const desconocido = await anon.rpc("qr_vincular", { p_token: tokenQR, p_dni: "11111111" })
  chequeo("un DNI inexistente no revela nada", (desconocido.data as { error?: string })?.error === "NO_ENCONTRADO")
  const juan = (await admin.from("socios").select("id").eq("dni", "40112908").single()).data!
  await admin.from("asistencias").delete().eq("socio_id", juan.id).gte("fecha", new Date(Date.now() - 4 * 3600e3).toISOString())
  const antes = (await admin.from("asistencias").select("id", { count: "exact", head: true }).eq("socio_id", juan.id)).count ?? 0
  const vinc = (await anon.rpc("qr_vincular", { p_token: tokenQR, p_dni: "40.112.908" })).data as Record<string, unknown>
  const permitidas = ["ok", "dispositivo", "nombre", "plan_tipo", "vencimiento", "clases_restantes", "dias_gracia", "ya_registrado", "hora"]
  chequeo("con DNI válido registra el ingreso", vinc?.ok === true && vinc.ya_registrado === false)
  chequeo("solo devuelve nombre de pila y datos de la cuota", Object.keys(vinc ?? {}).every((k) => permitidas.includes(k)) && !String(vinc?.nombre).includes(" "))
  const otraVez = (await anon.rpc("qr_ingresar", { p_token: tokenQR, p_dispositivo: vinc.dispositivo as string })).data as Record<string, unknown>
  const despues = (await admin.from("asistencias").select("id", { count: "exact", head: true }).eq("socio_id", juan.id)).count ?? 0
  chequeo("el celular vinculado entra sin DNI", otraVez?.ok === true)
  chequeo("no cuenta dos veces dentro de las 3 horas", otraVez?.ya_registrado === true && despues === antes + 1, `${antes} → ${despues}`)
  const dispAnon = await anon.from("socio_dispositivos").select("token")
  chequeo("nadie puede listar los celulares vinculados", (dispAnon.data ?? []).length === 0)
  const interno = await anon.rpc("_qr_registrar" as never, {} as never)
  chequeo("la función interna no se puede llamar", !!interno.error)
  const { data: gymOtro } = await otro.from("gyms").select("qr_token").single()
  if (gymOtro) {
    const cruzado = (await anon.rpc("qr_ingresar", { p_token: gymOtro.qr_token, p_dispositivo: vinc.dispositivo as string })).data as { error?: string }
    chequeo("un celular de un gimnasio no sirve en otro", cruzado?.error === "DISPOSITIVO_DESCONOCIDO")
  }
  for (let i = 0; i < 20; i++) await anon.rpc("qr_vincular", { p_token: tokenQR, p_dni: String(20000000 + i) })
  const bloqueado = (await anon.rpc("qr_vincular", { p_token: tokenQR, p_dni: "40112908" })).data as { error?: string }
  chequeo("frena a quien prueba muchos DNIs", bloqueado?.error === "DEMASIADOS_INTENTOS")
  await admin.from("qr_intentos_fallidos").delete().eq("gym_id", gymDemo.id)
  await admin.from("gyms").update({ qr_activo: false }).eq("id", gymDemo.id)
  const pausado = (await anon.rpc("qr_ingresar", { p_token: tokenQR, p_dispositivo: vinc.dispositivo as string })).data as { error?: string }
  chequeo("con el QR pausado no registra", pausado?.error === "QR_INACTIVO")
  await admin.from("gyms").update({ qr_activo: true }).eq("id", gymDemo.id)
  await anon.rpc("qr_desvincular", { p_dispositivo: vinc.dispositivo as string })
  const regen = await sofia.rpc("qr_regenerar")
  chequeo("recepción no puede regenerar el QR", !!regen.error)
  const nuevoQR = await dueno.rpc("qr_regenerar")
  const conViejo = (await anon.rpc("qr_gimnasio", { p_token: tokenQR })).data ?? []
  chequeo("el dueño genera un QR nuevo y el viejo deja de funcionar", !nuevoQR.error && conViejo.length === 0, nuevoQR.error?.message)

  console.log("\nPIN del socio (perfil desde el QR)")
  const tokenNuevo = nuevoQR.data as string
  const vinc2 = (await anon.rpc("qr_vincular", { p_token: tokenNuevo, p_dni: "40112908" })).data as { dispositivo: string }
  const arg = { p_token: tokenNuevo, p_dispositivo: vinc2.dispositivo }
  type Resp = Record<string, unknown> & { ok?: boolean; error?: string }
  const llamar = async (fn: string, extra: Record<string, unknown> = {}) => (await anon.rpc(fn as never, { ...arg, ...extra } as never)).data as unknown as Resp
  chequeo("al principio no tiene PIN", (await llamar("qr_perfil_estado")).tiene_pin === false)
  chequeo("sin PIN elegido no se puede entrar al perfil", (await llamar("qr_perfil", { p_pin: "1234" })).error === "SIN_PIN")
  chequeo("rechaza un PIN que no son 4 números", (await llamar("qr_pin_crear", { p_pin: "12a4" })).error === "PIN_INVALIDO")
  const crea = await llamar("qr_pin_crear", { p_pin: "4821" })
  chequeo("el socio elige su PIN y ve su perfil", crea.ok === true && typeof crea.nombre === "string")
  const perfilJson = JSON.stringify(crea)
  chequeo("el perfil no trae montos ni precios", !/monto|precio/i.test(perfilJson))
  const datosJuan = (await admin.from("socios").select("dni, telefono, email").eq("id", juan.id).single()).data!
  chequeo(
    "DNI, teléfono y email salen enmascarados",
    typeof crea.dni === "string" && !crea.dni.includes(datosJuan.dni) && String(crea.dni).endsWith(datosJuan.dni.slice(-3)) &&
      (!crea.telefono || String(crea.telefono).includes("•")) && (!crea.email || String(crea.email).includes("•")),
  )
  chequeo("no se puede pisar un PIN ya elegido", (await llamar("qr_pin_crear", { p_pin: "9999" })).error === "YA_TIENE_PIN")
  const hash = (await admin.from("socio_pins").select("pin_hash").eq("socio_id", juan.id).single()).data!.pin_hash
  chequeo("el PIN se guarda cifrado", hash !== "4821" && hash.startsWith("$2"))
  const pinsAnon = await anon.from("socio_pins").select("pin_hash")
  chequeo("nadie puede leer la tabla de PIN", (pinsAnon.data ?? []).length === 0)
  chequeo("con el PIN correcto entra al perfil", (await llamar("qr_perfil", { p_pin: "4821" })).ok === true)
  const mal1 = await llamar("qr_perfil", { p_pin: "0000" })
  chequeo("un PIN incorrecto avisa cuántos intentos quedan", mal1.error === "PIN_INCORRECTO" && mal1.restantes === 4)
  for (let i = 0; i < 3; i++) await llamar("qr_perfil", { p_pin: "0000" })
  const quinto = await llamar("qr_perfil", { p_pin: "0000" })
  chequeo("al quinto intento fallido se bloquea", quinto.error === "BLOQUEADO")
  chequeo("bloqueado no entra ni con el PIN correcto", (await llamar("qr_perfil", { p_pin: "4821" })).error === "BLOQUEADO")
  if (gymOtro) {
    const cruce = (await anon.rpc("qr_perfil" as never, { p_token: gymOtro.qr_token, p_dispositivo: vinc2.dispositivo, p_pin: "4821" } as never)).data as unknown as Resp
    chequeo("un celular de otro gimnasio no abre el perfil", cruce?.error === "DISPOSITIVO_DESCONOCIDO")
  }
  chequeo("sin sesión no se puede restablecer un PIN", !!(await anon.rpc("socio_restablecer_pin", { p_socio: juan.id })).error)
  chequeo("el dueño de otro gimnasio no puede restablecerlo", !!(await otro.rpc("socio_restablecer_pin", { p_socio: juan.id })).error)
  chequeo("recepción ve si el socio tiene PIN", (await sofia.rpc("socio_tiene_pin", { p_socio: juan.id })).data === true)
  const reinicio = await sofia.rpc("socio_restablecer_pin", { p_socio: juan.id })
  chequeo("recepción restablece el PIN", !reinicio.error, reinicio.error?.message)
  chequeo("al restablecer, el celular del socio queda desvinculado", (await llamar("qr_perfil_estado")).error === "DISPOSITIVO_DESCONOCIDO")
  const quedan = await admin.from("socio_pins").select("socio_id").eq("socio_id", juan.id)
  chequeo("el PIN viejo se borró", (quedan.data ?? []).length === 0)

  console.log("\nRutinas")
  const dia = (n: string) => ({ nombre: n, ejercicios: [{ nombre: "Sentadilla", series: "4", repeticiones: "8-10", descanso: "90 s", nota: "" }] })
  const nueva = await sofia.rpc("guardar_rutina", { p_rutina: { nombre: "Rutina de prueba", descripcion: "", dias: [dia("Día A"), dia("Día B"), dia("Día C")] } })
  const rutinaId = nueva.data as string
  chequeo("recepción puede armar una rutina", !nueva.error && !!rutinaId, nueva.error?.message)
  const sinDias = await sofia.rpc("guardar_rutina", { p_rutina: { nombre: "Vacía", dias: [] } })
  chequeo("una rutina sin días se rechaza", !!sinDias.error && sinDias.error.message.includes("RUTINA_INVALIDA"))
  chequeo("el dueño del mismo gimnasio la ve", ((await dueno.from("rutinas").select("id").eq("id", rutinaId)).data ?? []).length === 1)
  chequeo("el dueño de otro gimnasio no la ve", ((await otro.from("rutinas").select("id").eq("id", rutinaId)).data ?? []).length === 0)
  const ajena = await otro.rpc("guardar_rutina", { p_rutina: { id: rutinaId, nombre: "Pisada", dias: [dia("X")] } })
  chequeo("el dueño de otro gimnasio no puede editarla", !!ajena.error)
  const ajenaAsig = await otro.rpc("asignar_rutina", { p_socio: juan.id, p_rutina: rutinaId })
  chequeo("ni asignarla a socios que no son suyos", !!ajenaAsig.error)
  chequeo("sin sesión no se pueden usar las funciones", !!(await anon.rpc("guardar_rutina", { p_rutina: { nombre: "x", dias: [dia("A")] } })).error)
  chequeo("sin sesión no se leen las tablas", ((await anon.from("rutina_ejercicios").select("id")).data ?? []).length === 0)
  const directa = await sofia.from("rutinas").insert({ gym_id: gymDemo.id, nombre: "Directa" })
  chequeo("no se puede escribir directo en la tabla", !!directa.error)
  const asig = await sofia.rpc("asignar_rutina", { p_socio: juan.id, p_rutina: rutinaId })
  chequeo("recepción asigna la rutina a un socio", !asig.error, asig.error?.message)

  // Perfil del socio: qué día le toca hoy por rotación de asistencias
  const vinc3 = (await anon.rpc("qr_vincular", { p_token: tokenNuevo, p_dni: "40112908" })).data as { dispositivo: string }
  const arg3 = { p_token: tokenNuevo, p_dispositivo: vinc3.dispositivo }
  const perfil3 = ((await anon.rpc("qr_pin_crear" as never, { ...arg3, p_pin: "4821" } as never)).data as unknown) as { ok?: boolean; rutinas?: { id: string; hoy: number; dias: { nombre: string; ejercicios: unknown[] }[] }[] }
  chequeo("el perfil trae la rutina asignada con sus días", perfil3?.ok === true && perfil3.rutinas?.[0]?.id === rutinaId && perfil3.rutinas[0].dias.length === 3 && perfil3.rutinas[0].dias[0].ejercicios.length === 1)
  await admin.from("socio_rutinas").update({ asignada_en: new Date(Date.now() - 400 * 86400e3).toISOString() }).eq("socio_id", juan.id).eq("rutina_id", rutinaId)
  const fechas = ((await admin.from("asistencias").select("fecha").eq("socio_id", juan.id)).data ?? []).map((a) => a.fecha)
  const aDia = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso))
  const hoyAR = aDia(new Date().toISOString())
  const antesHoy = new Set(fechas.map(aDia).filter((d) => d < hoyAR)).size
  const perfil4 = ((await anon.rpc("qr_perfil" as never, { ...arg3, p_pin: "4821" } as never)).data as unknown) as { rutinas?: { hoy: number }[] }
  chequeo("«hoy te toca» rota por los días distintos en que vino", perfil4.rutinas?.[0]?.hoy === antesHoy % 3, `esperado ${antesHoy % 3}, recibido ${perfil4.rutinas?.[0]?.hoy}`)

  await sofia.rpc("archivar_rutina", { p_rutina: rutinaId, p_activo: false })
  const perfil5 = ((await anon.rpc("qr_perfil" as never, { ...arg3, p_pin: "4821" } as never)).data as unknown) as { rutinas?: unknown[] }
  chequeo("una rutina archivada deja de verse en el perfil", (perfil5.rutinas ?? []).length === 0)
  await sofia.rpc("archivar_rutina", { p_rutina: rutinaId, p_activo: true })
  const quitada = await sofia.rpc("quitar_rutina", { p_socio: juan.id, p_rutina: rutinaId })
  const perfil6 = ((await anon.rpc("qr_perfil" as never, { ...arg3, p_pin: "4821" } as never)).data as unknown) as { rutinas?: unknown[] }
  chequeo("al quitarla desaparece del perfil", !quitada.error && (perfil6.rutinas ?? []).length === 0)
  const copia = await sofia.rpc("duplicar_rutina", { p_rutina: rutinaId })
  const ejCopia = await admin.from("rutina_ejercicios").select("id, dia_id").in("dia_id", ((await admin.from("rutina_dias").select("id").eq("rutina_id", copia.data as string)).data ?? []).map((d) => d.id))
  chequeo("duplicar copia los días y ejercicios", !copia.error && (ejCopia.data ?? []).length === 3)

  // Limpieza de lo creado en este bloque
  await admin.from("rutinas").delete().eq("gym_id", gymDemo.id).in("id", [rutinaId, copia.data as string])
  await admin.from("socio_pins").delete().eq("socio_id", juan.id)
  await admin.from("socio_dispositivos").delete().eq("socio_id", juan.id)

  console.log("\nEntrenamientos del socio")
  const vinc5 = (await anon.rpc("qr_vincular", { p_token: tokenNuevo, p_dni: "40112908" })).data as { dispositivo: string }
  const base5 = { p_token: tokenNuevo, p_dispositivo: vinc5.dispositivo }
  type R5 = Record<string, unknown> & { ok?: boolean; error?: string; records?: string[]; id?: string; repetido?: boolean; restantes?: number; series?: number }
  const llamar5 = async (fn: string, extra: Record<string, unknown> = {}) => (await anon.rpc(fn as never, { ...base5, ...extra } as never)).data as unknown as R5
  await llamar5("qr_pin_crear", { p_pin: "4821" })
  const sesion = (cliente: string, press: [number, number][], sentadilla: [number, number][]) => ({
    cliente_id: cliente, rutina_nombre: "Rutina de prueba", dia_nombre: "Día A",
    ejercicios: [
      { nombre: "Press de banca", series: press.map(([peso, reps]) => ({ peso, reps })) },
      { nombre: "Sentadilla", series: sentadilla.map(([peso, reps]) => ({ peso, reps })) },
    ],
  })
  const uuid = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`

  chequeo("sin entrenamientos el historial viene vacío", Object.keys(((await llamar5("qr_entrenamiento_datos", { p_pin: "4821" })).ejercicios as object) ?? {}).length === 0)
  chequeo("con un PIN incorrecto no se puede guardar", (await llamar5("qr_entrenamiento_guardar", { p_pin: "0000", p_datos: sesion(uuid(1), [[60, 8]], [[80, 5]]) })).error === "PIN_INCORRECTO")
  chequeo("rechaza una sesión sin ejercicios", (await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: { cliente_id: uuid(1), ejercicios: [] } })).error === "DATOS_INVALIDOS")
  chequeo("rechaza pesos o repeticiones imposibles", (await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: sesion(uuid(1), [[-5, 8]], [[80, 5]]) })).error === "DATOS_INVALIDOS")
  chequeo("rechaza una serie vacía", (await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: { cliente_id: uuid(1), ejercicios: [{ nombre: "X", series: [{}] }] } })).error === "DATOS_INVALIDOS")

  const s1 = await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: sesion(uuid(1), [[60, 8], [60, 8], [55, 10]], [[80, 5]]) })
  chequeo("guarda el primer entrenamiento", s1.ok === true && s1.series === 4, JSON.stringify(s1))
  chequeo("la primera vez no cuenta como récord", (s1.records ?? []).length === 0)
  const s1b = await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: sesion(uuid(1), [[60, 8], [60, 8], [55, 10]], [[80, 5]]) })
  const cuenta = Number(((await admin.from("entrenamientos").select("id", { count: "exact", head: true }).eq("socio_id", juan.id)).count) ?? 0)
  chequeo("reenviar el mismo entrenamiento no lo duplica", s1b.repetido === true && s1b.id === s1.id && cuenta === 1, `${cuenta} sesiones`)

  const hist = (await llamar5("qr_entrenamiento_datos", { p_pin: "4821" })).ejercicios as Record<string, { series: { peso: number; reps: number }[]; mejor_e1rm: number }>
  chequeo("el historial devuelve la última vez y la mejor marca", hist["press de banca"]?.series.length === 3 && Math.abs(hist["press de banca"].mejor_e1rm - 76) < 0.01, JSON.stringify(hist["press de banca"]))

  const s2 = await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: sesion(uuid(2), [[62.5, 8]], [[80, 4]]) })
  chequeo("superar la marca anterior da récord (solo en ese ejercicio)", JSON.stringify(s2.records) === JSON.stringify(["Press de banca"]), JSON.stringify(s2.records))
  const s3 = await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: sesion(uuid(3), [[50, 8]], [[70, 5]]) })
  chequeo("una sesión más liviana no marca récord", s3.ok === true && (s3.records ?? []).length === 0)
  const marcados = Number(((await admin.from("entrenamiento_series").select("id", { count: "exact", head: true }).eq("socio_id", juan.id).eq("es_record", true)).count) ?? 0)
  chequeo("solo la mejor serie del ejercicio queda marcada", marcados === 1, `${marcados} marcadas`)

  const perfil7 = ((await llamar5("qr_perfil", { p_pin: "4821" })) as unknown) as { entrenamientos?: unknown[]; entrenamientos_30?: number }
  chequeo("el perfil muestra los últimos entrenamientos", (perfil7.entrenamientos ?? []).length === 3 && perfil7.entrenamientos_30 === 3)

  if (gymOtro) {
    const cruce5 = (await anon.rpc("qr_entrenamiento_guardar" as never, { p_token: gymOtro.qr_token, p_dispositivo: vinc5.dispositivo, p_pin: "4821", p_datos: sesion(uuid(9), [[60, 8]], [[80, 5]]) } as never)).data as unknown as R5
    chequeo("un celular de otro gimnasio no puede guardar", cruce5?.error === "DISPOSITIVO_DESCONOCIDO")
  }
  chequeo("sin sesión no se leen los entrenamientos", ((await anon.from("entrenamiento_series").select("id")).data ?? []).length === 0 && ((await anon.from("entrenamientos").select("id")).data ?? []).length === 0)
  for (let i = 0; i < 5; i++) await llamar5("qr_entrenamiento_guardar", { p_pin: "9999", p_datos: sesion(uuid(20 + i), [[60, 8]], [[80, 5]]) })
  chequeo("guardar con PIN incorrecto repetido bloquea (mismo freno que el perfil)", (await llamar5("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: sesion(uuid(30), [[60, 8]], [[80, 5]]) })).error === "BLOQUEADO")

  await admin.from("entrenamientos").delete().eq("socio_id", juan.id)
  await admin.from("socio_pins").delete().eq("socio_id", juan.id)
  await admin.from("socio_dispositivos").delete().eq("socio_id", juan.id)

  console.log("\nProgreso de entrenamientos")
  const vinc6 = (await anon.rpc("qr_vincular", { p_token: tokenNuevo, p_dni: "40112908" })).data as { dispositivo: string }
  const base6 = { p_token: tokenNuevo, p_dispositivo: vinc6.dispositivo }
  type R6 = Record<string, unknown> & { ok?: boolean; error?: string; racha_semanas?: number; ejercicios?: { nombre: string; puntos: { fecha: string; peso: number; e1rm: number }[] }[] }
  const llamar6 = async (fn: string, extra: Record<string, unknown> = {}) => (await anon.rpc(fn as never, { ...base6, ...extra } as never)).data as unknown as R6
  await llamar6("qr_pin_crear", { p_pin: "4821" })
  const ses6 = (cliente: string, peso: number) => ({
    cliente_id: cliente, rutina_nombre: "Rutina de prueba", dia_nombre: "Día A",
    ejercicios: [{ nombre: "Press de banca", series: [{ peso, reps: 8 }] }, { nombre: "Remo", series: [{ peso: 40, reps: 10 }] }],
  })
  const id6 = (n: number) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`
  for (const [n, peso] of [[1, 60], [2, 62.5], [3, 50]] as [number, number][]) await llamar6("qr_entrenamiento_guardar", { p_pin: "4821", p_datos: ses6(id6(n), peso) })

  chequeo("el progreso exige el PIN", (await llamar6("qr_progreso", { p_pin: "0000" })).error === "PIN_INCORRECTO")
  const prog = await llamar6("qr_progreso", { p_pin: "4821" })
  const press = prog.ejercicios?.find((e) => e.nombre === "Press de banca")
  chequeo("el progreso trae un punto por sesión, en orden", prog.ok === true && press?.puntos.length === 3, JSON.stringify(press?.puntos.map((q) => q.e1rm)))
  chequeo("cada punto trae el mejor peso y el 1RM estimado", !!press && Math.abs(press.puntos[1].e1rm - 79.17) < 0.01 && press.puntos[1].peso === 62.5)
  chequeo("incluye todos los ejercicios entrenados", (prog.ejercicios ?? []).length === 2)
  const otroDisp = (await anon.rpc("qr_progreso" as never, { p_token: gymOtro?.qr_token ?? "x", p_dispositivo: vinc6.dispositivo, p_pin: "4821" } as never)).data as unknown as R6
  chequeo("un celular de otro gimnasio no ve el progreso", !!gymOtro && otroDisp?.error === "DISPOSITIVO_DESCONOCIDO")

  // Racha semanal: se contrasta con un cálculo independiente en JS
  const aDiaAR = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso))
  const lunesDe = (dia: string) => { const d = new Date(dia + "T00:00:00Z"); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.getTime() }
  const semanasConAsistencia = new Set(((await admin.from("asistencias").select("fecha").eq("socio_id", juan.id)).data ?? []).map((a) => lunesDe(aDiaAR(a.fecha))))
  let semana = lunesDe(aDiaAR(new Date().toISOString()))
  if (!semanasConAsistencia.has(semana)) semana -= 7 * 86400e3
  let esperada = 0
  while (semanasConAsistencia.has(semana)) { esperada++; semana -= 7 * 86400e3 }
  const perfil8 = await llamar6("qr_perfil", { p_pin: "4821" })
  chequeo("la racha semanal del perfil coincide con el cálculo independiente", perfil8.racha_semanas === esperada, `esperada ${esperada}, recibida ${perfil8.racha_semanas}`)

  // El personal lee los entrenamientos de su gimnasio (ficha del socio), pero no los escribe
  chequeo("recepción lee los entrenamientos de su gimnasio", ((await sofia.from("entrenamientos").select("id").eq("socio_id", juan.id)).data ?? []).length === 3)
  chequeo("el dueño lee las series de sus socios", ((await dueno.from("entrenamiento_series").select("id").eq("socio_id", juan.id)).data ?? []).length === 6)
  chequeo("el dueño de otro gimnasio no ve nada", ((await otro.from("entrenamientos").select("id")).data ?? []).length === 0 && ((await otro.from("entrenamiento_series").select("id")).data ?? []).length === 0)
  chequeo("el personal no puede crear entrenamientos a mano", !!(await sofia.from("entrenamientos").insert({ gym_id: gymDemo.id, socio_id: juan.id, cliente_id: id6(99) })).error)
  const mod = await sofia.from("entrenamiento_series").update({ peso: 999 }).eq("socio_id", juan.id).select()
  chequeo("ni modificar las series", !!mod.error || (mod.data ?? []).length === 0)
  const bor = await dueno.from("entrenamientos").delete().eq("socio_id", juan.id).select()
  chequeo("ni borrarlas", !!bor.error || (bor.data ?? []).length === 0)

  await admin.from("entrenamientos").delete().eq("socio_id", juan.id)
  await admin.from("socio_pins").delete().eq("socio_id", juan.id)
  await admin.from("socio_dispositivos").delete().eq("socio_id", juan.id)

  console.log("\nAvisos de cuota por WhatsApp")
  const aviso = await sofia.rpc("registrar_aviso", { p_socio: juan.id, p_tipo: "vencida" })
  chequeo("recepción registra un aviso", !aviso.error, aviso.error?.message)
  chequeo("el aviso queda en la auditoría", ((await admin.from("auditoria").select("id").eq("gym_id", gymDemo.id).eq("accion", "Avisó por WhatsApp")).data ?? []).length >= 1)
  chequeo("un tipo de aviso inválido se rechaza", !!(await sofia.rpc("registrar_aviso", { p_socio: juan.id, p_tipo: "otro" })).error)
  chequeo("el dueño de otro gimnasio no puede avisar a socios ajenos", !!(await otro.rpc("registrar_aviso", { p_socio: juan.id, p_tipo: "vencida" })).error)
  chequeo("sin sesión no se registran avisos", !!(await anon.rpc("registrar_aviso", { p_socio: juan.id, p_tipo: "vencida" })).error)
  chequeo("el personal lee los avisos de su gimnasio", ((await sofia.from("recordatorios").select("id").eq("socio_id", juan.id)).data ?? []).length === 1)
  chequeo("otro gimnasio y sin sesión no los ven", ((await otro.from("recordatorios").select("id")).data ?? []).length === 0 && ((await anon.from("recordatorios").select("id")).data ?? []).length === 0)
  chequeo("no se pueden escribir avisos a mano", !!(await sofia.from("recordatorios").insert({ gym_id: gymDemo.id, socio_id: juan.id, tipo: "vencida" })).error)
  const mensajeRecep = await sofia.from("gyms").update({ msg_vencida: "Hackeado" }).eq("id", gymDemo.id).select()
  chequeo("recepción no puede cambiar los mensajes del gimnasio", !!mensajeRecep.error || (mensajeRecep.data ?? []).length === 0)
  const mensajeDueno = await dueno.from("gyms").update({ msg_por_vencer: "Hola {nombre}, tu cuota {cuando}." }).eq("id", gymDemo.id).select("msg_por_vencer")
  chequeo("el dueño guarda sus mensajes", !mensajeDueno.error && mensajeDueno.data?.[0]?.msg_por_vencer === "Hola {nombre}, tu cuota {cuando}.")
  await admin.from("gyms").update({ msg_por_vencer: null, msg_vencida: null }).eq("id", gymDemo.id)
  await admin.from("recordatorios").delete().eq("gym_id", gymDemo.id)

  console.log("\nVideos de técnica y biblioteca de ejercicios")
  const conVideo = (video: string) => ({ nombre: "Rutina con video", descripcion: "", dias: [{ nombre: "Día A", ejercicios: [{ nombre: "Sentadilla", series: "4", repeticiones: "8", descanso: "90 s", nota: "", video }] }] })
  const malos = ["http://www.youtube.com/watch?v=abc123", "https://evil.com/watch?v=abc", "javascript:alert(1)", "https://youtube.com.evil.com/watch?v=1", "https://www.youtube.com/watch?v=a b", "https://www.instagram.com/p/abc/"]
  let rechazados = 0
  for (const v of malos) if ((await sofia.rpc("guardar_rutina", { p_rutina: conVideo(v) })).error) rechazados++
  chequeo("solo se aceptan videos https de YouTube o Vimeo", rechazados === malos.length, `${rechazados} de ${malos.length} rechazados`)
  const buenos = ["https://www.youtube.com/watch?v=abc123", "https://youtu.be/abc123", "https://www.youtube.com/shorts/abc123", "https://vimeo.com/123456", ""]
  let aceptados = 0
  const idsVid: string[] = []
  for (const v of buenos) { const r = await sofia.rpc("guardar_rutina", { p_rutina: conVideo(v) }); if (!r.error) { aceptados++; idsVid.push(r.data as string) } }
  chequeo("acepta YouTube, Vimeo y también sin video", aceptados === buenos.length, `${aceptados} de ${buenos.length}`)
  const conV = await admin.from("rutina_ejercicios").select("video_url").in("dia_id", ((await admin.from("rutina_dias").select("id").eq("rutina_id", idsVid[0])).data ?? []).map((d) => d.id))
  chequeo("el video queda guardado en el ejercicio", conV.data?.[0]?.video_url === "https://www.youtube.com/watch?v=abc123")
  const dup = await sofia.rpc("duplicar_rutina", { p_rutina: idsVid[0] })
  const vDup = await admin.from("rutina_ejercicios").select("video_url").in("dia_id", ((await admin.from("rutina_dias").select("id").eq("rutina_id", dup.data as string)).data ?? []).map((d) => d.id))
  chequeo("duplicar la rutina copia el video", !dup.error && vDup.data?.[0]?.video_url === "https://www.youtube.com/watch?v=abc123")
  const mano = await admin.from("rutina_ejercicios").update({ video_url: "https://evil.com/x" }).eq("video_url", "https://www.youtube.com/watch?v=abc123")
  chequeo("ni siquiera con acceso directo se guarda un video de otro sitio (restricción en la tabla)", !!mano.error)

  // El perfil del socio trae el video del ejercicio
  await sofia.rpc("asignar_rutina", { p_socio: juan.id, p_rutina: idsVid[0] })
  const vinc9 = (await anon.rpc("qr_vincular", { p_token: tokenNuevo, p_dni: "40112908" })).data as { dispositivo: string }
  const base9 = { p_token: tokenNuevo, p_dispositivo: vinc9.dispositivo }
  await anon.rpc("qr_pin_crear" as never, { ...base9, p_pin: "4821" } as never)
  const perfil9 = ((await anon.rpc("qr_perfil" as never, { ...base9, p_pin: "4821" } as never)).data as unknown) as { rutinas?: { dias: { ejercicios: { video: string }[] }[] }[] }
  chequeo("el perfil del socio incluye el video de cada ejercicio", perfil9.rutinas?.[0]?.dias[0]?.ejercicios[0]?.video === "https://www.youtube.com/watch?v=abc123")

  // Biblioteca
  const e1 = await sofia.rpc("guardar_ejercicio_biblioteca", { p_nombre: "Hip thrust", p_grupo: "Glúteos", p_video: "https://youtu.be/abc" })
  chequeo("recepción agrega un ejercicio a la biblioteca", !e1.error && !!e1.data, e1.error?.message)
  const e2 = await dueno.rpc("guardar_ejercicio_biblioteca", { p_nombre: "HIP THRUST", p_grupo: "Piernas", p_video: "" })
  chequeo("el mismo nombre (sin importar mayúsculas) se actualiza, no se duplica", !e2.error && e2.data === e1.data && ((await admin.from("biblioteca_ejercicios").select("id").eq("gym_id", gymDemo.id)).data ?? []).length === 1)
  chequeo("rechaza un video de otro sitio", !!(await sofia.rpc("guardar_ejercicio_biblioteca", { p_nombre: "Remo", p_grupo: "", p_video: "https://evil.com/x" })).error)
  chequeo("rechaza un nombre vacío", !!(await sofia.rpc("guardar_ejercicio_biblioteca", { p_nombre: " ", p_grupo: "", p_video: "" })).error)
  chequeo("el personal lee la biblioteca de su gimnasio", ((await sofia.from("biblioteca_ejercicios").select("id")).data ?? []).length === 1)
  chequeo("otro gimnasio y sin sesión no la ven", ((await otro.from("biblioteca_ejercicios").select("id")).data ?? []).length === 0 && ((await anon.from("biblioteca_ejercicios").select("id")).data ?? []).length === 0)
  chequeo("no se escribe directo en la tabla", !!(await sofia.from("biblioteca_ejercicios").insert({ gym_id: gymDemo.id, nombre: "Directo" })).error)
  chequeo("sin sesión no se usan las funciones", !!(await anon.rpc("guardar_ejercicio_biblioteca", { p_nombre: "X", p_grupo: "", p_video: "" })).error)
  await otro.rpc("eliminar_ejercicio_biblioteca", { p_id: e1.data as string })
  chequeo("el dueño de otro gimnasio no puede borrar ejercicios ajenos", ((await admin.from("biblioteca_ejercicios").select("id")).data ?? []).length === 1)
  await sofia.rpc("eliminar_ejercicio_biblioteca", { p_id: e1.data as string })
  chequeo("recepción borra un ejercicio de la biblioteca", ((await admin.from("biblioteca_ejercicios").select("id")).data ?? []).length === 0)

  await admin.from("rutinas").delete().eq("gym_id", gymDemo.id).like("nombre", "Rutina con video")
  await admin.from("rutinas").delete().eq("gym_id", gymDemo.id).like("nombre", "Copia de Rutina con video")
  await admin.from("socio_pins").delete().eq("socio_id", juan.id)
  await admin.from("socio_dispositivos").delete().eq("socio_id", juan.id)

  console.log("\nRutinas propias del socio y récords")
  const ana = (await admin.from("socios").select("id, dni").eq("gym_id", gymDemo.id).eq("activo", true).neq("dni", "40112908").limit(1).single()).data!
  const vJ = (await anon.rpc("qr_vincular", { p_token: tokenNuevo, p_dni: "40112908" })).data as { dispositivo: string }
  const vA = (await anon.rpc("qr_vincular", { p_token: tokenNuevo, p_dni: ana.dni })).data as { dispositivo: string }
  const bJ = { p_token: tokenNuevo, p_dispositivo: vJ.dispositivo }
  const bA = { p_token: tokenNuevo, p_dispositivo: vA.dispositivo }
  type R7 = Record<string, unknown> & { ok?: boolean; error?: string; detalle?: string; id?: string; rutinas?: { id: string; nombre: string; propia: boolean; hoy: number; dias: unknown[] }[]; ejercicios?: Record<string, unknown>[] }
  const rpc7 = async (base: object, fn: string, extra: Record<string, unknown> = {}) => (await anon.rpc(fn as never, { ...base, ...extra } as never)).data as unknown as R7
  await rpc7(bJ, "qr_pin_crear", { p_pin: "4821" })
  await rpc7(bA, "qr_pin_crear", { p_pin: "1357" })
  const mia = (nombre: string) => ({ nombre, descripcion: "", dias: [{ nombre: "Día 1", ejercicios: [{ nombre: "Sentadilla", series: "4", repeticiones: "8", descanso: "90 s", nota: "", video: "" }] }] })

  chequeo("el socio crea su propia rutina", (await rpc7(bJ, "qr_rutina_guardar", { p_pin: "4821", p_rutina: mia("Mi rutina de piernas") })).ok === true)
  const propia = (await admin.from("rutinas").select("id").eq("socio_id", juan.id)).data!
  chequeo("queda guardada como suya, no del gimnasio", propia.length === 1)
  const idProp = propia[0].id as string
  chequeo("con un PIN incorrecto no se guarda", (await rpc7(bJ, "qr_rutina_guardar", { p_pin: "0000", p_rutina: mia("X") })).error === "PIN_INCORRECTO")
  const sinDiasProp = await rpc7(bJ, "qr_rutina_guardar", { p_pin: "4821", p_rutina: { nombre: "Vacía", dias: [] } })
  chequeo("rechaza una rutina sin días, con el motivo", sinDiasProp.error === "RUTINA_INVALIDA" && /días/.test(sinDiasProp.detalle ?? ""))
  const malVideo = mia("Con video malo"); malVideo.dias[0].ejercicios[0].video = "https://evil.com/x"
  chequeo("rechaza un video que no es de YouTube o Vimeo", (await rpc7(bJ, "qr_rutina_guardar", { p_pin: "4821", p_rutina: malVideo })).error === "RUTINA_INVALIDA")

  const perfilJ = (await rpc7(bJ, "qr_perfil", { p_pin: "4821" }))
  chequeo("su perfil la muestra marcada como propia, con «hoy» y días", perfilJ.rutinas?.[0]?.propia === true && perfilJ.rutinas[0].dias.length === 1 && typeof perfilJ.rutinas[0].hoy === "number")
  chequeo("otro socio no la ve en su perfil", ((await rpc7(bA, "qr_perfil", { p_pin: "1357" })).rutinas ?? []).every((r) => r.id !== idProp))

  // Privacidad frente al personal
  chequeo("recepción no ve las rutinas propias de los socios", ((await sofia.from("rutinas").select("id").eq("id", idProp)).data ?? []).length === 0)
  chequeo("el dueño tampoco, ni sus días ni ejercicios", ((await dueno.from("rutinas").select("id").eq("id", idProp)).data ?? []).length === 0
    && ((await dueno.from("rutina_dias").select("id").eq("rutina_id", idProp)).data ?? []).length === 0
    && ((await dueno.from("rutina_ejercicios").select("id").eq("gym_id", gymDemo.id).eq("nombre", "Sentadilla")).data ?? []).length === 0)
  chequeo("el personal no puede editarla", !!(await sofia.rpc("guardar_rutina", { p_rutina: { id: idProp, nombre: "Pisada", dias: [{ nombre: "X", ejercicios: [] }] } })).error)
  chequeo("ni asignarla, archivarla o duplicarla",
    !!(await sofia.rpc("asignar_rutina", { p_socio: ana.id, p_rutina: idProp })).error &&
    !!(await sofia.rpc("archivar_rutina", { p_rutina: idProp, p_activo: false })).error &&
    !!(await sofia.rpc("duplicar_rutina", { p_rutina: idProp })).error)
  chequeo("la rutina sigue intacta después de esos intentos", ((await admin.from("rutinas").select("nombre, activo").eq("id", idProp).single()).data)?.nombre === "Mi rutina de piernas")

  // Entre socios
  chequeo("otro socio no puede editar la rutina de Juan", (await rpc7(bA, "qr_rutina_guardar", { p_pin: "1357", p_rutina: { id: idProp, ...mia("Robada") } })).error === "RUTINA_INEXISTENTE")
  chequeo("ni borrarla", (await rpc7(bA, "qr_rutina_eliminar", { p_pin: "1357", p_id: idProp })).error === "RUTINA_INEXISTENTE")
  const edit = await rpc7(bJ, "qr_rutina_guardar", { p_pin: "4821", p_rutina: { id: idProp, ...mia("Mi rutina de piernas v2") } })
  chequeo("el dueño de la rutina la edita", edit.ok === true && ((await admin.from("rutinas").select("nombre").eq("id", idProp).single()).data)?.nombre === "Mi rutina de piernas v2")

  // Límite de 10
  let creadas = 1
  for (let i = 0; i < 12; i++) { const r = await rpc7(bJ, "qr_rutina_guardar", { p_pin: "4821", p_rutina: mia(`Extra ${i}`) }); if (r.ok) creadas++ }
  chequeo("el límite es de 10 rutinas propias", creadas === 10 && (await rpc7(bJ, "qr_rutina_guardar", { p_pin: "4821", p_rutina: mia("Una más") })).error === "LIMITE_RUTINAS", `${creadas} creadas`)
  chequeo("la lista del gimnasio no se ensucia con las propias", ((await dueno.from("rutinas").select("id").eq("gym_id", gymDemo.id)).data ?? []).every((r) => r.id !== idProp))
  chequeo("el socio borra una rutina propia", (await rpc7(bJ, "qr_rutina_eliminar", { p_pin: "4821", p_id: idProp })).ok === true && ((await admin.from("rutinas").select("id").eq("id", idProp)).data ?? []).length === 0)

  // Biblioteca vista por el socio
  const bib = await sofia.rpc("guardar_ejercicio_biblioteca", { p_nombre: "Hip thrust", p_grupo: "Glúteos", p_video: "https://youtu.be/abc" })
  const bibJ = await rpc7(bJ, "qr_biblioteca", { p_pin: "4821" })
  chequeo("el socio ve la biblioteca de su gimnasio para armar su rutina", bibJ.ok === true && (bibJ.ejercicios ?? []).some((e) => e.nombre === "Hip thrust" && e.video === "https://youtu.be/abc"))
  chequeo("con PIN incorrecto no la ve", (await rpc7(bJ, "qr_biblioteca", { p_pin: "0000" })).error === "PIN_INCORRECTO")
  await admin.from("biblioteca_ejercicios").delete().eq("id", bib.data as string)

  // Récords
  const id7 = (n: number) => `00000000-0000-4000-8000-0000000003${String(n).padStart(2, "0")}`
  const ses7 = (cliente: string, peso: number, reps: number, rutina?: string) => ({ cliente_id: cliente, rutina_id: rutina, rutina_nombre: "X", dia_nombre: "D", ejercicios: [{ nombre: "Press de banca", series: [{ peso, reps }] }] })
  for (const [n, peso, reps] of [[1, 60, 8], [2, 70, 5], [3, 62.5, 8]] as [number, number, number][]) await rpc7(bJ, "qr_entrenamiento_guardar", { p_pin: "4821", p_datos: ses7(id7(n), peso, reps) })
  const rec = await rpc7(bJ, "qr_records", { p_pin: "4821" })
  const pressRec = (rec.ejercicios ?? []).find((e) => e.nombre === "Press de banca") as Record<string, number> | undefined
  chequeo("«Mis récords» trae la mejor fuerza estimada con su peso y repeticiones", !!pressRec && Math.abs(Number(pressRec.e1rm) - 81.67) < 0.01 && Number(pressRec.peso_e1rm) === 70 && Number(pressRec.reps_e1rm) === 5, JSON.stringify(pressRec))
  chequeo("y el mayor peso, las sesiones y cuántos récords batió", !!pressRec && Number(pressRec.mejor_peso) === 70 && Number(pressRec.sesiones) === 3 && Number(pressRec.records) === 1)
  chequeo("los récords exigen el PIN", (await rpc7(bJ, "qr_records", { p_pin: "0000" })).error === "PIN_INCORRECTO")
  chequeo("otro socio no ve los récords de Juan", ((await rpc7(bA, "qr_records", { p_pin: "1357" })).ejercicios ?? []).length === 0)

  // Un entrenamiento no puede colgarse de la rutina propia de otro socio
  const rAna = (await rpc7(bA, "qr_rutina_guardar", { p_pin: "1357", p_rutina: mia("De Ana") })).id as string
  await rpc7(bJ, "qr_entrenamiento_guardar", { p_pin: "4821", p_datos: ses7(id7(9), 50, 8, rAna) })
  chequeo("un entrenamiento no se asocia a la rutina propia de otro socio", ((await admin.from("entrenamientos").select("rutina_id").eq("cliente_id", id7(9)).single()).data)?.rutina_id === null)

  // El historial (que lee el personal) no revela el nombre de una rutina propia
  const rSecreta = (await rpc7(bJ, "qr_rutina_guardar", { p_pin: "4821", p_rutina: mia("Mi rutina secreta") })).id as string
  await rpc7(bJ, "qr_entrenamiento_guardar", { p_pin: "4821", p_datos: { cliente_id: id7(20), rutina_id: rSecreta, rutina_nombre: "Mi rutina secreta", dia_nombre: "Día secreto", ejercicios: [{ nombre: "Press de banca", series: [{ peso: 40, reps: 8 }] }] } })
  const visto = (await sofia.from("entrenamientos").select("rutina_nombre, dia_nombre, rutina_id").eq("cliente_id", id7(20)).single()).data
  chequeo("el historial de una rutina propia queda anónimo para el personal", visto?.rutina_nombre === "Rutina propia" && visto?.dia_nombre === "" && visto?.rutina_id === rSecreta, JSON.stringify(visto))

  await admin.from("rutinas").delete().in("socio_id", [juan.id, ana.id])
  await admin.from("entrenamientos").delete().in("socio_id", [juan.id, ana.id])
  await admin.from("socio_pins").delete().in("socio_id", [juan.id, ana.id])
  await admin.from("socio_dispositivos").delete().in("socio_id", [juan.id, ana.id])

  console.log("\nAnular cobros y ventas")
  const planMensual = (await admin.from("planes").select("id, precio").eq("gym_id", gymDemo.id).eq("tipo", "mensual").eq("activo", true).limit(1).single()).data!
  const sociosTodos = (await admin.from("socios").select("id").eq("gym_id", gymDemo.id).eq("activo", true).not("vencimiento", "is", null).limit(1).single()).data!
  const foto = async () => (await admin.from("socios").select("plan_id, vencimiento, clases_restantes, activo").eq("id", sociosTodos.id).single()).data!
  const socioAntes = await foto()
  const c1 = await sofia.rpc("cobrar", { p_socio: sociosTodos.id, p_plan: planMensual.id, p_monto: planMensual.precio, p_medio: "efectivo" })
  const c2 = await sofia.rpc("cobrar", { p_socio: sociosTodos.id, p_plan: planMensual.id, p_monto: planMensual.precio, p_medio: "efectivo" })
  chequeo("recepción puede cobrar dos veces (prueba)", !c1.error && !c2.error, c1.error?.message ?? c2.error?.message)
  const movDe = async (pagoId: string) => (await admin.from("pagos").select("movimiento_id").eq("id", pagoId).single()).data!.movimiento_id
  const pago1 = (c1.data as { pago_id: string }).pago_id
  const pago2 = (c2.data as { pago_id: string }).pago_id
  const mov1 = await movDe(pago1)
  const mov2 = await movDe(pago2)
  const orden = await dueno.rpc("anular_movimiento", { p_movimiento: mov1, p_motivo: "prueba" })
  chequeo("no deja anular un cobro si hay uno posterior", !!orden.error && orden.error.message.includes("ANULAR_ANTES_EL_ULTIMO_COBRO"), orden.error?.message)
  const a2 = await dueno.rpc("anular_movimiento", { p_movimiento: mov2, p_motivo: "prueba" })
  const a1 = await dueno.rpc("anular_movimiento", { p_movimiento: mov1, p_motivo: "prueba" })
  chequeo("anulando en orden se aceptan los dos", !a2.error && !a1.error, a2.error?.message ?? a1.error?.message)
  const socioDespues = await foto()
  chequeo("el socio vuelve a su plan, vencimiento y estado anteriores", JSON.stringify(socioDespues) === JSON.stringify(socioAntes), JSON.stringify({ socioAntes, socioDespues }))
  const anuladoDosVeces = await dueno.rpc("anular_movimiento", { p_movimiento: mov1, p_motivo: "otra vez" })
  chequeo("no se puede anular dos veces", !!anuladoDosVeces.error && anuladoDosVeces.error.message.includes("YA_ANULADO"))

  const prodV = (await admin.from("productos").select("id, stock, precio").eq("gym_id", gymDemo.id).eq("activo", true).gte("stock", 5).limit(1).single()).data!
  const venta = await sofia.rpc("vender", { p_items: [{ productoId: prodV.id, cantidad: 3 }], p_medio: "efectivo" })
  const stockVenta = (await admin.from("productos").select("stock").eq("id", prodV.id).single()).data!.stock
  chequeo("la venta descuenta el stock", !venta.error && stockVenta === prodV.stock - 3, venta.error?.message)
  const anuV = await dueno.rpc("anular_movimiento", { p_movimiento: venta.data as string, p_motivo: "prueba" })
  const stockFin = (await admin.from("productos").select("stock").eq("id", prodV.id).single()).data!.stock
  chequeo("anular la venta devuelve el stock", !anuV.error && stockFin === prodV.stock, anuV.error?.message)
  const lineaAnul = await admin.from("movimientos_stock").select("cantidad").eq("movimiento_id", venta.data as string).eq("tipo", "anulacion")
  chequeo("queda un movimiento de stock de anulación", (lineaAnul.data ?? []).length === 1 && lineaAnul.data![0].cantidad === 3)

  console.log("\nLogo del gimnasio (Storage)")
  const png = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" })
  const ruta = `${gymDemo.id}/logo.webp`
  const sube = await dueno.storage.from("logos").upload(ruta, png, { upsert: true, contentType: "image/png" })
  chequeo("el dueño sube el logo de su gimnasio", !sube.error, sube.error?.message)
  const subeRecep = await sofia.storage.from("logos").upload(ruta, png, { upsert: true, contentType: "image/png" })
  chequeo("recepción no puede cambiar el logo", !!subeRecep.error)
  const subeOtro = await otro.storage.from("logos").upload(ruta, png, { upsert: true, contentType: "image/png" })
  chequeo("el dueño de otro gimnasio no puede tocar este logo", !!subeOtro.error)
  const subeAnon = await createClient<Database>(URL, PUBLICA, { auth: { persistSession: false } }).storage.from("logos").upload(ruta, png, { upsert: true, contentType: "image/png" })
  chequeo("sin sesión no se puede subir", !!subeAnon.error)
  const texto = await dueno.storage.from("logos").upload(`${gymDemo.id}/otro.txt`, new Blob(["hola"], { type: "text/plain" }), { contentType: "text/plain" })
  chequeo("rechaza archivos que no son imagen", !!texto.error)
  await admin.storage.from("logos").remove([ruta])

  // --- Marca del gimnasio en la app del socio ---
  const marcaOk = await dueno.from("gyms").update({ color_acento: "#7c3aed", msg_bienvenida: "¡Dale que hoy se entrena!" }).eq("id", gymDemo.id)
  chequeo("el dueño personaliza color y bienvenida", !marcaOk.error, marcaOk.error?.message)
  const marcaPublica = ((await anon.rpc("qr_gimnasio", { p_token: tokenNuevo })).data ?? [])[0]
  chequeo("el QR público trae color, bienvenida y logo del gimnasio", marcaPublica?.color_acento === "#7c3aed" && marcaPublica?.msg_bienvenida === "¡Dale que hoy se entrena!" && "logo_url" in (marcaPublica ?? {}))
  chequeo("rechaza un color que no es #rrggbb", !!(await dueno.from("gyms").update({ color_acento: "rojo" }).eq("id", gymDemo.id)).error)
  chequeo("rechaza una bienvenida de más de 140 letras", !!(await dueno.from("gyms").update({ msg_bienvenida: "x".repeat(141) }).eq("id", gymDemo.id)).error)
  const marcaRecep = await sofia.from("gyms").update({ color_acento: "#000000" }).eq("id", gymDemo.id).select("id")
  chequeo("recepción no puede cambiar la marca", (marcaRecep.data ?? []).length === 0)
  const marcaOtro = await otro.from("gyms").update({ color_acento: "#000000" }).eq("id", gymDemo.id).select("id")
  chequeo("el dueño de otro gimnasio no puede cambiarla", (marcaOtro.data ?? []).length === 0)
  await admin.from("gyms").update({ color_acento: null, msg_bienvenida: null }).eq("id", gymDemo.id)

  // --- Rutinas del gimnasio visibles para todos ---
  type PerfilRut = { rutinas?: { id: string; nombre: string; del_gimnasio: boolean; propia: boolean }[] }
  const perfilDe = async () => ((await admin.rpc("_qr_perfil" as never, { p_socio: juan.id } as never)).data as unknown as PerfilRut).rutinas ?? []
  const todos = await dueno.rpc("guardar_rutina", { p_rutina: { nombre: "Rutina abierta E2E", para_todos: true, dias: [dia("A"), dia("B")] } })
  chequeo("el personal crea una rutina para todos los socios", !todos.error && !!todos.data, todos.error?.message)
  const idTodos = todos.data as string
  const visibles = (await perfilDe()).filter((r) => r.id === idTodos)
  chequeo("el socio la ve en su perfil sin que se la asignen, marcada del gimnasio", visibles.length === 1 && visibles[0].del_gimnasio && !visibles[0].propia)
  await dueno.rpc("asignar_rutina", { p_socio: juan.id, p_rutina: idTodos })
  const unaVez = (await perfilDe()).filter((r) => r.id === idTodos)
  chequeo("si además se la asignan aparece una sola vez (como asignada)", unaVez.length === 1 && !unaVez[0].del_gimnasio)
  await admin.from("socio_rutinas").delete().eq("rutina_id", idTodos)
  const sinMarca = await dueno.rpc("guardar_rutina", { p_rutina: { id: idTodos, nombre: "Rutina abierta E2E", para_todos: false, dias: [dia("A")] } })
  chequeo("se puede sacar la marca", !sinMarca.error && (await perfilDe()).every((r) => r.id !== idTodos))
  await dueno.rpc("guardar_rutina", { p_rutina: { id: idTodos, nombre: "Rutina abierta E2E", para_todos: true, dias: [dia("A")] } })
  await dueno.rpc("archivar_rutina", { p_rutina: idTodos, p_activo: false })
  chequeo("archivada deja de verse", (await perfilDe()).every((r) => r.id !== idTodos))
  const propiaAbierta = await admin.from("rutinas").insert({ gym_id: gymDemo.id, socio_id: juan.id, nombre: "Propia abierta", para_todos: true })
  chequeo("una rutina propia de un socio no puede ser para todos", !!propiaAbierta.error)
  const ajenaTodos = await otro.rpc("guardar_rutina", { p_rutina: { id: idTodos, nombre: "Pisada", para_todos: false, dias: [dia("X")] } })
  chequeo("el dueño de otro gimnasio no puede cambiarla", !!ajenaTodos.error)
  await admin.from("rutinas").delete().eq("id", idTodos)

  // Limpieza del gimnasio de prueba
  if (nuevo.data) await admin.from("gyms").delete().eq("id", nuevo.data)
  const u = (await otro.auth.getUser()).data.user
  if (u) await admin.auth.admin.deleteUser(u.id)

  console.log(fallas ? `\n${fallas} chequeos fallaron.` : "\nTodos los chequeos pasaron.")
  process.exit(fallas ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
