import Link from "next/link"
import { cn } from "@/lib/utils"

/** Pestañas que navegan por URL (se pueden compartir y recargar). */
export function TabsLink({ items, activo, className }: { items: { id: string; label: string; href: string }[]; activo: string; className?: string }) {
  return (
    <nav className={cn("mb-6 flex gap-1 overflow-x-auto border-b", className)}>
      {items.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          aria-current={activo === i.id ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 pt-1 pb-2.5 text-sm font-medium transition-colors",
            activo === i.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  )
}
