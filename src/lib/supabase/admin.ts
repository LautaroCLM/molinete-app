import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Cliente con la clave secreta: saltea RLS. Usar SOLO en el servidor y solo para
 * operaciones de administración (invitar usuarios). Nunca exponerlo al navegador.
 */
export function supabaseAdmin() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
