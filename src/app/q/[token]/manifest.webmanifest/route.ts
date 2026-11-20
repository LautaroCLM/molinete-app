import { supabaseServer } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Manifest de la app del socio: al instalarla desde el QR de su gimnasio, el ícono abre directo su perfil.
 * Abre con ?app=1: en ese modo NO se registra asistencia (la asistencia solo se registra al escanear el QR).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const sb = await supabaseServer()
  const { data } = await sb.rpc("qr_gimnasio", { p_token: token })
  const gym = data?.[0]
  if (!gym) return new Response("No encontrado", { status: 404 })

  const nombre = gym.nombre as string
  const manifiesto = {
    id: `/q/${token}`,
    name: `${nombre} · Mi perfil`,
    short_name: nombre.length > 12 ? nombre.slice(0, 12).trim() : nombre,
    description: `Tu perfil, tu cuota y tu rutina en ${nombre}.`,
    lang: "es-AR",
    start_url: `/q/${token}?app=1`,
    scope: `/q/${token}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b100e",
    theme_color: "#0b100e",
    categories: ["health", "fitness"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
  return new Response(JSON.stringify(manifiesto), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" },
  })
}
