import { cache } from "react"
import type { Metadata, Viewport } from "next"
import { supabaseServer } from "@/lib/supabase/server"
import { LogoMarca } from "@/components/layout/logo"
import { COLOR_RE } from "@/lib/color"
import { IngresoQR } from "./ingreso-qr"

const gimnasioDelQR = cache(async (token: string) => {
  const sb = await supabaseServer()
  const { data } = await sb.rpc("qr_gimnasio", { p_token: token })
  return data?.[0] ?? null
})

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const gym = await gimnasioDelQR(token)
  return {
    title: "Ingreso",
    robots: { index: false, follow: false },
    // La app que el socio instala desde su QR abre directo su perfil.
    manifest: `/q/${encodeURIComponent(token)}/manifest.webmanifest`,
    ...(gym?.logo_url ? { icons: { icon: `/q/${encodeURIComponent(token)}/icono/192`, apple: `/q/${encodeURIComponent(token)}/icono/180` } } : {}),
  }
}

export async function generateViewport({ params }: { params: Promise<{ token: string }> }): Promise<Viewport> {
  const gym = await gimnasioDelQR((await params).token)
  return { themeColor: gym?.color_acento && COLOR_RE.test(gym.color_acento) ? gym.color_acento : "#0b100e" }
}

export default async function IngresoQRPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ app?: string }>
}) {
  const { token } = await params
  const { app } = await searchParams
  const gym = await gimnasioDelQR(token)

  if (!gym)
    return (
      <Aviso titulo="Este QR ya no funciona" texto="Puede que el gimnasio haya generado uno nuevo. Pedilo en recepción." />
    )
  if (!gym.activo)
    return <Aviso titulo={gym.nombre} texto="El ingreso con QR está pausado. Avisá en recepción que llegaste." />

  return (
    <IngresoQR
      token={token}
      gymId={gym.id}
      gymNombre={gym.nombre}
      modoApp={app === "1"}
      marca={{ logoUrl: gym.logo_url, color: gym.color_acento, bienvenida: gym.msg_bienvenida }}
    />
  )
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
