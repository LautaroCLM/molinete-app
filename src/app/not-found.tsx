import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogoMarca } from "@/components/layout/logo"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center [--logo-hole:var(--background)]">
      <LogoMarca className="size-14" />
      <h1 className="font-display text-4xl font-semibold">No encontramos esa página</h1>
      <p className="max-w-sm text-muted-foreground">Puede que el enlace esté mal escrito o que el socio ya no exista.</p>
      <Button asChild size="lg">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  )
}
