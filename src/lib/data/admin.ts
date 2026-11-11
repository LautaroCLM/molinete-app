import "server-only"
/**
 * Lecturas del panel de administración de la plataforma. Usan la clave secreta
 * (saltean RLS), por eso TODAS pasan primero por exigirSuperadmin().
 */
import { cache } from "react"
import { redirect } from "next/navigation"
import { supabaseServer } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

/** Redirige al login o al panel normal a quien no sea administrador de la plataforma. */
export const exigirSuperadmin = cache(async () => {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect("/login")
  const { data } = await sb.rpc("es_superadmin")
  if (data !== true) redirect("/")
  return { id: user.id, email: user.email ?? "" }
})

export interface GimnasioResumen {
  id: string
  nombre: string
  localidad: string
  creado: string
  usuarios: number
  usuariosActivos: number
  socios: number
  ultimoAcceso: string | null
}

export async function listarGimnasios(): Promise<GimnasioResumen[]> {
  await exigirSuperadmin()
  const sa = supabaseAdmin()
  const [{ data: gyms, error }, { data: perfiles }] = await Promise.all([
    sa.from("gyms").select("id, nombre, localidad, created_at").order("created_at", { ascending: false }),
    sa.from("perfiles").select("gym_id, activo, ultimo_acceso"),
  ])
  if (error) throw error
  const socios = await Promise.all(
    (gyms ?? []).map((g) => sa.from("socios").select("id", { count: "exact", head: true }).eq("gym_id", g.id).eq("activo", true)),
  )
  return (gyms ?? []).map((g, i) => {
    const propios = (perfiles ?? []).filter((p) => p.gym_id === g.id)
    const accesos = propios.map((p) => p.ultimo_acceso).filter((a): a is string => !!a).sort()
    return {
      id: g.id,
      nombre: g.nombre,
      localidad: g.localidad,
      creado: g.created_at,
      usuarios: propios.length,
      usuariosActivos: propios.filter((p) => p.activo).length,
      socios: socios[i].count ?? 0,
      ultimoAcceso: accesos.at(-1) ?? null,
    }
  })
}

export async function getGimnasioAdmin(id: string) {
  await exigirSuperadmin()
  const sa = supabaseAdmin()
  const { data: gym } = await sa.from("gyms").select("*").eq("id", id).maybeSingle()
  if (!gym) return null
  const [{ data: perfiles }, socios] = await Promise.all([
    sa.from("perfiles").select("*").eq("gym_id", id).order("created_at"),
    sa.from("socios").select("id", { count: "exact", head: true }).eq("gym_id", id).eq("activo", true),
  ])
  return { gym, usuarios: perfiles ?? [], socios: socios.count ?? 0 }
}
