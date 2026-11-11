import { UsuariosConfig } from "@/features/configuracion/usuarios-config"
import { getSesion, getUsuarios } from "@/lib/data"

export const metadata = { title: "Usuarios y roles" }

export default async function UsuariosPage() {
  const [{ usuario }, usuarios] = await Promise.all([getSesion(), getUsuarios()])
  return <UsuariosConfig usuarios={usuarios} yo={usuario.id} />
}
