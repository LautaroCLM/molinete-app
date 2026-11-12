export const dynamic = "force-dynamic"

/** Identificador de la versión publicada. La pantalla lo compara con el de cuando se cargó para avisar de actualizaciones. */
export function GET() {
  return Response.json({ id: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" }, { headers: { "Cache-Control": "no-store" } })
}
