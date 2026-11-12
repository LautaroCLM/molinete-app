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
