"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Menu, Search, Moon, Sun, Monitor, LogOut, UserRound, DoorOpen, ShoppingBag, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { iniciales, nombreCompleto } from "@/lib/format"
import { ROLES } from "@/lib/labels"
import { usePanel } from "./panel-context"
import { Logo } from "./logo"
import { SidebarNav, SidebarUsuario } from "./sidebar"
import { cerrarSesion } from "@/lib/actions"
import { useBusqueda } from "./command-search"

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none hidden h-5 items-center rounded border bg-muted px-1.5 font-sans text-[0.7rem] font-medium text-muted-foreground sm:inline-flex">
      {children}
    </kbd>
  )
}

export function Header() {
  const { usuario, gym, abrir } = usePanel()
  const { abrirBusqueda } = useBusqueda()
  const [menuMovil, setMenuMovil] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuMovil(true)} aria-label="Abrir menú">
          <Menu />
        </Button>

        <div className="hidden min-w-0 flex-col leading-tight md:flex">
          <span className="truncate text-[0.95rem] font-semibold">{gym.nombre}</span>
          <span className="truncate text-xs text-muted-foreground">{gym.direccion}</span>
        </div>

        <button
          onClick={abrirBusqueda}
          className="ml-auto hidden h-10 w-full max-w-md items-center sm:flex gap-2.5 rounded-lg border bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none md:ml-6"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">Buscar socio por nombre o DNI</span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <Button variant="ghost" size="icon" className="ml-auto sm:hidden" onClick={abrirBusqueda} aria-label="Buscar socio">
          <Search />
        </Button>

        <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => abrir({ tipo: "llegada" })} className="hidden sm:inline-flex">
                <DoorOpen />
                Registrar llegada
              </Button>
            </TooltipTrigger>
            <TooltipContent>Atajo: F2</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden"
            onClick={() => abrir({ tipo: "llegada" })}
            aria-label="Registrar llegada"
          >
            <DoorOpen />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => abrir({ tipo: "cobro" })} className="hidden xl:inline-flex">
                <Banknote />
                Cobrar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Atajo: F3</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => abrir({ tipo: "venta" })} className="hidden xl:inline-flex">
                <ShoppingBag />
                Vender
              </Button>
            </TooltipTrigger>
            <TooltipContent>Atajo: F4</TooltipContent>
          </Tooltip>

          <MenuUsuario />
        </div>
      </div>

      <Sheet open={menuMovil} onOpenChange={setMenuMovil}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [--logo-hole:var(--sidebar)]">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-white">
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col px-3 pb-5">
            <SidebarNav onNavigate={() => setMenuMovil(false)} />
            <div className="mt-auto">
              <SidebarUsuario />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <span className="sr-only">Sesión de {nombreCompleto(usuario)}</span>
    </header>
  )
}

function MenuUsuario() {
  const { usuario } = usePanel()
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="ml-1 flex items-center gap-2.5 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          aria-label="Menú de usuario"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{iniciales(usuario)}</AvatarFallback>
          </Avatar>
          <span className="hidden flex-col leading-tight 2xl:flex">
            <span className="text-sm font-semibold">{nombreCompleto(usuario)}</span>
            <span className="text-xs text-muted-foreground">{ROLES[usuario.rol].label}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{nombreCompleto(usuario)}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {usuario.email} · {ROLES[usuario.rol].label}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Apariencia</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun /> Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Oscuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> Según el sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserRound /> Mi perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void cerrarSesion()}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
