/** Color de acento de la app del socio: validación y texto legible encima. */
export const COLOR_RE = /^#[0-9a-fA-F]{6}$/

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

/** Blanco o casi negro, el que mejor se lee sobre `hex`. */
export function textoSobre(hex: string): string {
  return luminancia(hex) > 0.35 ? "#0b100e" : "#ffffff"
}

/** Variables CSS que repintan los botones y acentos de la app del socio; vacío si no hay color propio. */
export function estiloAcento(hex: string | null | undefined): Record<string, string> {
  if (!hex || !COLOR_RE.test(hex)) return {}
  return {
    "--primary": hex,
    "--primary-foreground": textoSobre(hex),
    "--ring": hex,
    "--brand-from": `color-mix(in srgb, ${hex}, white 14%)`,
    "--brand-to": `color-mix(in srgb, ${hex}, black 14%)`,
    "--brand-glow": `color-mix(in srgb, ${hex} 40%, transparent)`,
  }
}

export const COLORES_SUGERIDOS = [
  { hex: "#15803d", nombre: "Verde" },
  { hex: "#0e7490", nombre: "Turquesa" },
  { hex: "#1d4ed8", nombre: "Azul" },
  { hex: "#7c3aed", nombre: "Violeta" },
  { hex: "#be123c", nombre: "Rojo" },
  { hex: "#ea580c", nombre: "Naranja" },
  { hex: "#ca8a04", nombre: "Amarillo" },
  { hex: "#111827", nombre: "Negro" },
]
