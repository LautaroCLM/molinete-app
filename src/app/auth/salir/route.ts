import { NextResponse, type NextRequest } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

/** Cierra la sesión (por ejemplo, de un usuario desactivado) y vuelve al ingreso. */
export async function GET(request: NextRequest) {
  const sb = await supabaseServer()
  await sb.auth.signOut()
  const motivo = request.nextUrl.searchParams.get("motivo")
  return NextResponse.redirect(new URL(motivo === "inactivo" ? "/login?aviso=inactivo" : "/login", request.nextUrl))
}
