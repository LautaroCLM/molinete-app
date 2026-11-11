import "server-only"
import { headers } from "next/headers"
import QRCode from "qrcode"

/** URL pública del ingreso con QR. En producción conviene fijar NEXT_PUBLIC_SITE_URL. */
export async function urlIngreso(token: string) {
  const h = await headers()
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`
  return `${base.replace(/\/$/, "")}/q/${token}`
}

export async function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#161a22", light: "#ffffff" } })
}
