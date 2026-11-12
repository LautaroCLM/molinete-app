import type { MetadataRoute } from "next"

/** App instalable (PWA): en Android, Chrome ofrece "Instalar app" y queda como una app más. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Molinete · Gestión de gimnasios",
    short_name: "Molinete",
    description: "Socios, cuotas, asistencias, caja e inventario.",
    lang: "es-AR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b100e",
    theme_color: "#0b100e",
    categories: ["business", "productivity", "health"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Socios", short_name: "Socios", url: "/clientes" },
      { name: "Caja", short_name: "Caja", url: "/caja" },
    ],
  }
}
