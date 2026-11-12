import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Identifica cada publicación: el aviso "hay una nueva actualización" compara este valor.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.NODE_ENV === "production" ? (process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? String(Date.now())) : "dev" },
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
