import type { MetadataRoute } from "next"

/** Preparado para la PWA instalable (se completa con íconos PNG y service worker más adelante). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Molinete · Gestión de gimnasios",
    short_name: "Molinete",
    description: "Socios, cuotas, asistencias, caja e inventario.",
    lang: "es-AR",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#161a22",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
