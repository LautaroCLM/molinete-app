"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cerrarSesion } from "@/lib/actions"

export function SalirBoton() {
  return (
    <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:bg-white/10 hover:text-white" onClick={() => void cerrarSesion()}>
      <LogOut /> Salir
    </Button>
  )
}
