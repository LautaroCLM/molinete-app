import Link from "next/link"
import { AuthLayout } from "../auth-layout"
import { RegistroForm } from "./registro-form"

export const metadata = { title: "Crear cuenta" }

export default function RegistroPage() {
  return (
    <AuthLayout titulo="Creá la cuenta de tu gimnasio" bajada="Vas a quedar como dueño. Después podés invitar a tu equipo.">
      <RegistroForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Ingresá
        </Link>
      </p>
    </AuthLayout>
  )
}
