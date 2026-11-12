import Image from "next/image"
import { cn } from "@/lib/utils"

/** Logo oficial de Molinete (archivo original en /img; copia optimizada en /public/logo-molinete.png). */
export function LogoMarca({ className }: { className?: string }) {
  return <Image src="/logo-molinete.png" alt="" width={256} height={256} priority className={cn("size-9 shrink-0", className)} />
}

/** Disco de pesas dibujado: solo para marcas de agua y marcadores de posición. */
export function LogoDisco({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <circle cx="16" cy="16" r="14" fill="currentColor" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--logo-ring, var(--primary))" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="3.2" fill="var(--logo-hole, #161a22)" />
    </svg>
  )
}

export function Logo({ className, conTexto = true }: { className?: string; conTexto?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMarca />
      {conTexto && <span className="font-display text-[1.45rem] leading-none font-semibold tracking-tight">Molinete</span>}
    </span>
  )
}
