import sharp from "sharp"
import { supabaseServer } from "@/lib/supabase/server"
import { COLOR_RE } from "@/lib/color"

export const dynamic = "force-dynamic"

const TAMANOS = new Set([180, 192, 512])

/**
 * Ícono de la app del socio: el logo del gimnasio sobre su color, siempre en PNG.
 * El logo se sube como WebP y los generadores de imágenes de React no lo leen, por eso se arma con sharp.
 * Con `?maskable=1` el logo queda más chico para que no lo recorten los íconos redondos de Android.
 * Si no hay logo o no se puede leer, devuelve el ícono de Molinete en vez de una imagen rota.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; size: string }> }) {
  const { token, size } = await params
  const lado = Number(size)
  if (!TAMANOS.has(lado)) return new Response("No encontrado", { status: 404 })
  const maskable = new URL(req.url).searchParams.has("maskable")
  const porDefecto = () => Response.redirect(new URL(maskable ? "/icon-maskable-512.png" : lado === 512 ? "/icon-512.png" : "/icon-192.png", req.url), 307)

  const sb = await supabaseServer()
  const { data } = await sb.rpc("qr_gimnasio", { p_token: token })
  const gym = data?.[0]
  if (!gym?.logo_url) return porDefecto()

  const resp = await fetch(gym.logo_url).catch(() => null)
  if (!resp?.ok || !(resp.headers.get("content-type") ?? "").startsWith("image/")) return porDefecto()

  const fondo = gym.color_acento && COLOR_RE.test(gym.color_acento) ? gym.color_acento : "#0b100e"
  const logo = Math.round(lado * (maskable ? 0.6 : 0.82))
  const radio = Math.round(logo * 0.18)

  try {
    const esquinas = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${logo}" height="${logo}"><rect width="${logo}" height="${logo}" rx="${radio}" ry="${radio}"/></svg>`)
    const logoRedondo = await sharp(Buffer.from(await resp.arrayBuffer()))
      .resize(logo, logo, { fit: "cover" })
      .composite([{ input: esquinas, blend: "dest-in" }])
      .png()
      .toBuffer()
    const icono = await sharp({ create: { width: lado, height: lado, channels: 4, background: fondo } })
      .composite([{ input: logoRedondo }])
      .png()
      .toBuffer()
    return new Response(new Uint8Array(icono), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } })
  } catch {
    return porDefecto()
  }
}
