"use client"

import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Panel } from "@/components/shared/page-header"
import { cambiarEstadoUsuario } from "@/lib/actions"
import { ROLES } from "@/lib/labels"
import { hace, iniciales } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Rol, Usuario } from "@/types/domain"

/** El dueño ve a su equipo y puede desactivar o reactivar usuarios. Las altas las hace Molinete. */
export function UsuariosConfig({ usuarios, yo }: { usuarios: Usuario[]; yo: string }) {
  const avisar = (r: { ok: boolean; error?: string }, ok: string) => (r.ok ? toast.success(ok) : toast.error(r.error))

  return (
    <div className="flex flex-col gap-6">
      <Panel
        titulo="Usuarios"
        descripcion="Cada persona entra con su propio email y contraseña. Así queda registrado quién hizo cada cosa. Para sumar a alguien nuevo, pedíselo a Molinete."
        contenidoClassName="px-0 pb-0"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 text-xs">Persona</TableHead>
              <TableHead className="text-xs">Rol</TableHead>
              <TableHead className="hidden text-xs md:table-cell">Último ingreso</TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id} className={cn(!u.activo && "text-muted-foreground")}>
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs font-semibold">{iniciales(u)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        {u.nombre} {u.apellido}
                        {u.id === yo && <span className="text-xs font-normal text-muted-foreground">(vos)</span>}
                        {!u.activo && <span className="rounded-full bg-off-soft px-2 py-0.5 text-xs font-semibold text-off">Desactivado</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{ROLES[u.rol].label}</TableCell>
                <TableCell className="hidden text-muted-foreground first-letter:uppercase md:table-cell">
                  {u.ultimoAcceso ? hace(u.ultimoAcceso) : "Nunca"}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  {u.id !== yo && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${u.nombre}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.activo ? (
                          <DropdownMenuItem variant="destructive" onSelect={async () => avisar(await cambiarEstadoUsuario(u.id, false), `${u.nombre} ya no puede ingresar.`)}>
                            Desactivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={async () => avisar(await cambiarEstadoUsuario(u.id, true), `${u.nombre} puede volver a ingresar.`)}>Reactivar</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel titulo="Qué puede hacer cada rol">
        <dl className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <div key={r} className="rounded-lg bg-muted/60 p-4">
              <dt className="font-semibold">{ROLES[r].label}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{ROLES[r].descripcion}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  )
}
