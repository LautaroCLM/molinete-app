import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { supabaseServer } from "@/lib/supabase/server"

/** Destino de los enlaces de los emails (invitación, recuperación, confirmación de cuenta). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/"
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/"

  const sb = await supabaseServer()
  const { error } = tokenHash && type
    ? await sb.auth.verifyOtp({ type, token_hash: tokenHash })
    : code
      ? await sb.auth.exchangeCodeForSession(code)
      : { error: new Error("sin token") }

  if (error) return NextResponse.redirect(new URL("/login?aviso=enlace", url))
  return NextResponse.redirect(new URL(destino, url))
}
