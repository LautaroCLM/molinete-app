"use client"

import { FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export interface OpcionExportar {
  label: string
  /** Parámetros de la ruta /exportar/<tipo>, por ejemplo "rango=mes". */
  params?: string
}

/** Botón "Exportar a Excel". Con una sola opción descarga directo; con varias abre un menú. */
export function MenuExportar({ tipo, opciones, titulo = "Exportar a Excel" }: { tipo: string; opciones: OpcionExportar[]; titulo?: string }) {
  const href = (o: OpcionExportar) => `/exportar/${tipo}${o.params ? `?${o.params}` : ""}`

  if (opciones.length === 1) {
    return (
      <Button asChild variant="outline" size="lg">
        <a href={href(opciones[0])} download>
          <FileSpreadsheet /> {titulo}
        </a>
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg">
          <FileSpreadsheet /> {titulo}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Descargar .xlsx</DropdownMenuLabel>
        {opciones.map((o) => (
          <DropdownMenuItem key={o.label} asChild>
            <a href={href(o)} download>
              {o.label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
