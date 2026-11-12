import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Todo el panel depende del usuario y del gimnasio (datos dinámicos por sesión),
  // por eso no usamos Cache Components ni prefetch parcial.
  devIndicators: false,
  // Cache de cliente: volver a un módulo visitado hace menos de 30 s es instantáneo.
  // Las acciones (cobrar, vender, etc.) invalidan este cache al revalidar.
  experimental: { staleTimes: { dynamic: 30, static: 180 } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
