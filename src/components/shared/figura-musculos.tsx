import { MUSCULOS } from "@/lib/catalogo-ejercicios"
import { CUERPO_ESPALDA, CUERPO_FRENTE, type PoligonoCuerpo } from "@/lib/figura-cuerpo"
import type { SeriesPorMusculo } from "@/lib/musculos"

const formato = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","))

function Silueta({ poligonos, valores, max, titulo }: { poligonos: PoligonoCuerpo[]; valores: SeriesPorMusculo; max: number; titulo: string }) {
  return (
    <svg viewBox="0 0 100 200" className="h-auto w-full" role="img" aria-label={titulo}>
      {poligonos.map((poli, i) => {
        const v = Math.max(0, ...poli.m.map((m) => valores[m] ?? 0))
        const fuerza = v > 0 && max > 0 ? 0.35 + 0.65 * (v / max) : 0
        return (
          <polygon
            key={i}
            points={poli.p}
            style={{ fill: fuerza > 0 ? `color-mix(in srgb, var(--primary) ${Math.round(fuerza * 100)}%, transparent)` : "color-mix(in srgb, var(--foreground) 15%, transparent)" }}
            stroke="var(--card)"
            strokeWidth={0.4}
          />
        )
      })}
    </svg>
  )
}

/** Cuerpo de frente y de espalda con los músculos pintados según las series, y la lista ordenada. */
export function FiguraMusculos({ valores, sinMusculo = 0 }: { valores: SeriesPorMusculo; sinMusculo?: number }) {
  const filas = MUSCULOS.map((m) => ({ ...m, v: valores[m.id] ?? 0 }))
    .filter((f) => f.v > 0)
    .sort((a, b) => b.v - a.v)
  const max = filas[0]?.v ?? 0

  return (
    <div>
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
        <Silueta poligonos={CUERPO_FRENTE} valores={valores} max={max} titulo="Músculos trabajados, de frente" />
        <Silueta poligonos={CUERPO_ESPALDA} valores={valores} max={max} titulo="Músculos trabajados, de espalda" />
      </div>

      {filas.length > 0 ? (
        <>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Músculo</span>
            <span>Series</span>
          </div>
          <ul className="mt-1.5 flex flex-col gap-2">
            {filas.map((f) => (
              <li key={f.id} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate font-medium">{f.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (f.v / max) * 100)}%` }} />
                </span>
                <span className="text-right tabular-nums">{formato(f.v)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Cada serie suma 1 al músculo principal del ejercicio y 0,5 a los que lo ayudan.</p>
        </>
      ) : (
        <p className="mt-4 text-center text-sm text-muted-foreground">Todavía no hay series con músculo asignado.</p>
      )}
      {sinMusculo > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {sinMusculo} {sinMusculo === 1 ? "serie" : "series"} de ejercicios que no están en el catálogo no se pueden asignar a un músculo.
        </p>
      )}
    </div>
  )
}
