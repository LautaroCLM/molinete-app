import { cn } from "@/lib/utils"

function iniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  return (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : (palabras[0] ?? "?").slice(0, 2)).toUpperCase()
}

/** Logo del gimnasio; si no subió uno, un círculo con sus iniciales. */
export function GymAvatar({ nombre, logoUrl, className }: { nombre: string; logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagen de Storage ya achicada al subirla
      <img src={logoUrl} alt="" className={cn("size-9 shrink-0 rounded-lg bg-white/5 object-cover", className)} />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "bg-brand grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-primary-foreground",
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  )
}
