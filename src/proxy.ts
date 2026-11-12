import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

/** Rutas que no requieren sesión. */
const PUBLICAS = ["/login", "/recuperar", "/auth", "/q", "/desktop"]

/**
 * Refresca la sesión de Supabase en cada request y manda al login a quien no la tenga.
 * La autorización real (gimnasio y rol) la hacen RLS y las funciones de la base.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // getClaims valida el token localmente (sin viajar a Supabase en cada navegación).
  const { data: claims } = await supabase.auth.getClaims()
  const user = claims?.claims?.sub ? claims.claims : null

  const { pathname } = request.nextUrl
  const publica = PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!user && !publica) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = pathname === "/" ? "" : `?volver=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }
  if (user && (pathname === "/login")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|manifest.webmanifest|favicon.ico|.*\.(?:png|jpg|svg|webp)$).*)"],
}
