import type { Metadata, Viewport } from "next"
import { supabaseServer } from "@/lib/supabase/server"
import { LogoMarca } from "@/components/layout/logo"
import { IngresoQR } from "./ingreso-qr"

export const metadata: Metadata = { title: "Ingreso", robots: { index: false, follow: false } }
export const viewport: Viewport = { themeColor: "#161a22" }

export default async function IngresoQRPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const sb = await supabaseServer()
  const { data } = await sb.rpc("qr_gimnasio", { p_token: token })
  const gym = data?.[0]

  if (!gym)
    return (
      <Aviso titulo="Este QR ya no funciona" texto="Puede que el gimnasio haya generado uno nuevo. Pedilo en recepción." />
    )
  if (!gym.activo)
    return <Aviso titulo={gym.nombre} texto="El ingreso con QR está pausado. Avisá en recepción que llegaste." />

  return <IngresoQR token={token} gymId={gym.id} gymNombre={gym.nombre} />
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-sidebar px-6 text-center text-white [--logo-hole:var(--sidebar)]">
      <LogoMarca className="size-12" />
      <h1 className="font-display text-3xl font-semibold">{titulo}</h1>
      <p className="max-w-xs text-sidebar-foreground">{texto}</p>
    </main>
  )
}
