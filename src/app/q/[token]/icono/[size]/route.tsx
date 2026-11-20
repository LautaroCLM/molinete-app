import { ImageResponse } from "next/og"
import { supabaseServer } from "@/lib/supabase/server"
import { COLOR_RE } from "@/lib/color"

export const dynamic = "force-dynamic"

const TAMANOS = new Set([180, 192, 512])

/** Ícono de la app del socio: el logo del gimnasio sobre su color. `maskable` deja margen para recortes redondos. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; size: string }> }) {
  const { token, size } = await params
  const lado = Number(size)
  if (!TAMANOS.has(lado)) return new Response("No encontrado", { status: 404 })
  const sb = await supabaseServer()
  const { data } = await sb.rpc("qr_gimnasio", { p_token: token })
  const gym = data?.[0]
  if (!gym?.logo_url) return new Response("No encontrado", { status: 404 })

  // El logo se descarga acá y se incrusta: así el ícono no depende de que el generador de imágenes llegue al origen.
  const resp = await fetch(gym.logo_url).catch(() => null)
  const tipo = resp?.headers.get("content-type") ?? ""
  if (!resp?.ok || !tipo.startsWith("image/")) return new Response("No encontrado", { status: 404 })
  const logoUri = `data:${tipo};base64,${Buffer.from(await resp.arrayBuffer()).toString("base64")}`

  const fondo = gym.color_acento && COLOR_RE.test(gym.color_acento) ? gym.color_acento : "#0b100e"
  const maskable = new URL(req.url).searchParams.has("maskable")
  const logo = Math.round(lado * (maskable ? 0.6 : 0.82))
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: fondo }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUri} width={logo} height={logo} alt="" style={{ borderRadius: Math.round(logo * 0.18), objectFit: "cover" }} />
      </div>
    ),
    { width: lado, height: lado, headers: { "Cache-Control": "public, max-age=300" } },
  )
}
