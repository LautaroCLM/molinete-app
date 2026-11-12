import { cn } from "@/lib/utils"
import { OBJETOS_AVATAR } from "@/components/shared/avatar-objetos"

/** Colores de los objetos: vivos pero apagados, para que no cansen sobre fondo oscuro. */
const COLORES = ["#34c88a", "#2fb5a8", "#4b8fe0", "#8b7bd8", "#e0a13a", "#e0735f", "#d86a9a", "#a9b4ae"]
const OJOS = "#151515"

/** Hash simple y estable (FNV-1a): el mismo id siempre da el mismo número. */
function hash(texto: string) {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Avatar automático de un socio: un objeto con ojos, de un color que sale de su id.
 * Es neutro (sin género) y fijo: no se guarda nada, se dibuja siempre igual para el mismo socio.
 */
export function SocioAvatar({ id, className }: { id: string; nombre?: string; apellido?: string; className?: string }) {
  const h = hash(id)
  const objeto = OBJETOS_AVATAR[h % OBJETOS_AVATAR.length]
  const color = COLORES[(h >>> 8) % COLORES.length]
  const { x, y, separacion, escala } = objeto.ojos
  const ancho = 4 * escala
  const alto = 11 * escala
  return (
    <span
      aria-hidden
      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
      className={cn("grid size-9 shrink-0 place-items-center rounded-full select-none", className)}
    >
      <svg viewBox="0 0 100 100" className="size-[78%]" fill="none">
        <path d={objeto.d} fill={color} />
        {[x - separacion / 2, x + separacion / 2].map((cx) => (
          <rect key={cx} x={cx - ancho / 2} y={y - alto / 2} width={ancho} height={alto} rx={ancho / 2} fill={OJOS} />
        ))}
      </svg>
    </span>
  )
}
