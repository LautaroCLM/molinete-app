import { AuthLayout } from "../auth-layout"
import { LoginForm } from "./login-form"

export const metadata = { title: "Ingresar" }

const AVISOS: Record<string, string> = {
  inactivo: "Tu usuario fue desactivado. Hablá con el dueño del gimnasio.",
  enlace: "El enlace venció o ya se usó. Pedí uno nuevo.",
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ volver?: string; aviso?: string }> }) {
  const { volver, aviso } = await searchParams
  return (
    <AuthLayout titulo="Ingresá a tu gimnasio" bajada="Usá el email y la contraseña de tu cuenta.">
      <LoginForm volver={volver ?? "/"} aviso={aviso ? AVISOS[aviso] : undefined} />
    </AuthLayout>
  )
}
