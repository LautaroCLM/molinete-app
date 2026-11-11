"use server"
/**
 * Acciones del administrador de la plataforma. Cada una verifica primero que la
 * sesión sea de un administrador y recién entonces usa la clave secreta.
 */
import { revalidatePath } from "next/cache"
import { exigirSuperadmin } from "@/lib/data/admin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { altaGimnasioSchema, contrasenaSchema, usuarioAdminSchema, type ResultadoAccion } from "@/lib/schemas"

const MENSAJES: Record<string, string> = {
  YA_TIENE_GIMNASIO: "Ese usuario ya pertenece a un gimnasio.",
  USUARIO_INEXISTENTE: "No se encontró el usuario recién creado.",
  GIMNASIO_INEXISTENTE: "El gimnasio no existe.",
  DATOS_INCOMPLETOS: "Faltan datos obligatorios.",
}

function mensaje(error: { message?: string } | null | undefined) {
  const m = error?.message ?? ""
  const k = Object.keys(MENSAJES).find((x) => m.includes(x))
  return k ? MENSAJES[k] : "Algo salió mal. Probá de nuevo."
}

const primerError = (e: { issues: { message: string }[] }) => ({
  ok: false as const,
  error: e.issues[0]?.message ?? "Revisá los datos ingresados.",
})

/** Crea el usuario de Auth (confirmado, con contraseña). Devuelve su id o un error legible. */
async function crearUsuarioAuth(email: string, password: string, nombre: string): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } })
  if (error) {
    if (error.code === "email_exists") return { error: `Ya existe un usuario con el email ${email}.` }
    if (error.code === "weak_password") return { error: "La contraseña es muy débil. Usá una más larga." }
    return { error: `No se pudo crear el usuario ${email}.` }
  }
  return { id: data.user.id }
}

export async function crearGimnasioAdmin(datos: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await exigirSuperadmin()
  const r = altaGimnasioSchema.safeParse(datos)
  if (!r.success) return primerError(r.error)
  const { gimnasio, dueno, empleados } = r.data
  const sa = supabaseAdmin()

  const emails = [dueno.email, ...empleados.map((e) => e.email)].map((e) => e.toLowerCase())
  if (new Set(emails).size !== emails.length) return { ok: false, error: "Hay emails repetidos en el alta." }

  // Si algo falla a mitad de camino se borran los usuarios ya creados: no queda nada a medias.
  const creados: string[] = []
  const deshacer = async () => {
    for (const id of creados) await sa.auth.admin.deleteUser(id)
  }

  const uDueno = await crearUsuarioAuth(dueno.email, dueno.password, dueno.nombre)
  if ("error" in uDueno) return { ok: false, error: uDueno.error }
  creados.push(uDueno.id)

  const { data: gymId, error } = await sa.rpc("crear_gimnasio_admin", {
    p_email: dueno.email,
    p_nombre_gym: gimnasio.nombre,
    p_nombre: dueno.nombre,
    p_apellido: dueno.apellido,
    p_direccion: gimnasio.direccion,
    p_localidad: gimnasio.localidad,
    p_telefono: gimnasio.telefono,
    p_email_gym: gimnasio.email,
  })
  if (error || !gymId) {
    await deshacer()
    return { ok: false, error: mensaje(error) }
  }

  for (const e of empleados) {
    const u = await crearUsuarioAuth(e.email, e.password, e.nombre)
    if ("error" in u) {
      await sa.from("gyms").delete().eq("id", gymId)
      await deshacer()
      return { ok: false, error: u.error }
    }
    creados.push(u.id)
    const { error: e2 } = await sa.rpc("agregar_empleado_admin", { p_gym: gymId, p_email: e.email, p_nombre: e.nombre, p_apellido: e.apellido })
    if (e2) {
      await sa.from("gyms").delete().eq("id", gymId)
      await deshacer()
      return { ok: false, error: mensaje(e2) }
    }
  }
  revalidatePath("/admin")
  return { ok: true, data: { id: gymId } }
}

export async function agregarUsuarioAdmin(gymId: string, datos: unknown): Promise<ResultadoAccion> {
  await exigirSuperadmin()
  const r = usuarioAdminSchema.safeParse(datos)
  if (!r.success) return primerError(r.error)
  const sa = supabaseAdmin()
  const u = await crearUsuarioAuth(r.data.email, r.data.password, r.data.nombre)
  if ("error" in u) return { ok: false, error: u.error }
  const { error } = await sa.rpc("agregar_empleado_admin", {
    p_gym: gymId,
    p_email: r.data.email,
    p_nombre: r.data.nombre,
    p_apellido: r.data.apellido,
    p_rol: r.data.rol,
  })
  if (error) {
    await sa.auth.admin.deleteUser(u.id)
    return { ok: false, error: mensaje(error) }
  }
  revalidatePath(`/admin/${gymId}`)
  return { ok: true }
}

export async function restablecerContrasenaAdmin(usuarioId: string, datos: unknown): Promise<ResultadoAccion> {
  await exigirSuperadmin()
  const r = contrasenaSchema.safeParse(datos)
  if (!r.success) return primerError(r.error)
  const { error } = await supabaseAdmin().auth.admin.updateUserById(usuarioId, { password: r.data.password })
  if (error) return { ok: false, error: "No se pudo cambiar la contraseña." }
  return { ok: true }
}

export async function cambiarEstadoUsuarioAdmin(gymId: string, usuarioId: string, activo: boolean): Promise<ResultadoAccion> {
  await exigirSuperadmin()
  const { error } = await supabaseAdmin().from("perfiles").update({ activo }).eq("id", usuarioId).eq("gym_id", gymId)
  if (error) return { ok: false, error: "No se pudo actualizar el usuario." }
  revalidatePath(`/admin/${gymId}`)
  return { ok: true }
}
