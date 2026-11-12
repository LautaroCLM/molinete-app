/**
 * Instalación de la app (PWA). Chrome avisa con `beforeinstallprompt` cuando se puede instalar;
 * lo guardamos para ofrecer un botón "Instalar la app" cuando el usuario quiera.
 */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let evento: EventoInstalacion | null = null
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((f) => f())

let iniciado = false
/** Empieza a escuchar el aviso de Chrome. Se llama una vez, al abrir la app. */
export function iniciarPWA() {
  if (iniciado || typeof window === "undefined") return
  iniciado = true
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    evento = e as EventoInstalacion
    avisar()
  })
  window.addEventListener("appinstalled", () => {
    evento = null
    avisar()
  })
}

export const suscribirInstalacion = (f: () => void) => {
  oyentes.add(f)
  return () => {
    oyentes.delete(f)
  }
}
export const puedeInstalar = () => evento !== null

/** Muestra el diálogo de instalación del navegador. */
export async function instalarApp() {
  if (!evento) return false
  await evento.prompt()
  const { outcome } = await evento.userChoice
  evento = null
  avisar()
  return outcome === "accepted"
}
