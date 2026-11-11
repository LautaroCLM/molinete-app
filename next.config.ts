import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Todo el panel depende del usuario y del gimnasio (datos dinámicos por sesión),
  // por eso no usamos Cache Components ni prefetch parcial.
  devIndicators: false,
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
