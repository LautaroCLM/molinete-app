"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { UserPlus, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { cambiarEstadoUsuario, cambiarRol, invitarUsuario, reenviarInvitacion } from "@/lib/actions"
import { usuarioInvitacionSchema } from "@/lib/schemas"
import { ROLES } from "@/lib/labels"
import { hace, iniciales } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Rol, Usuario } from "@/types/domain"

export function UsuariosConfig({ usuarios, yo }: { usuarios: Usuario[]; yo: string }) {
  const [invitar, setInvitar] = useState(false)
  const avisar = (r: { ok: boolean; error?: string }, ok: string) => (r.ok ? toast.success(ok) : toast.error(r.error))

  return (
    <div className="flex flex-col gap-6">
      <Panel
        titulo="Usuarios"
        descripcion="Cada persona entra con su propio email y contraseña. Así queda registrado quién hizo cada cosa."
        accion={
          <Button onClick={() => setInvitar(true)}>
            <UserPlus /> Invitar
          </Button>
        }
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
                        {u.invitacionPendiente && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Invitación pendiente</span>}
                        {!u.activo && <span className="rounded-full bg-off-soft px-2 py-0.5 text-xs font-semibold text-off">Desactivado</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={u.rol}
                    disabled={u.id === yo || !u.activo}
                    onValueChange={async (v) => avisar(await cambiarRol(u.id, v as Rol), `${u.nombre} ahora es ${ROLES[v as Rol].label}.`)}
                  >
                    <SelectTrigger className="w-36" aria-label={`Rol de ${u.nombre}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLES) as Rol[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLES[r].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
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
                        {u.invitacionPendiente && (
                          <DropdownMenuItem onSelect={async () => avisar(await reenviarInvitacion(u.id), `Invitación reenviada a ${u.email}.`)}>Reenviar invitación</DropdownMenuItem>
                        )}
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

      <InvitarDialog abierto={invitar} cerrar={() => setInvitar(false)} />
    </div>
  )
}

function InvitarDialog({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [rol, setRol] = useState<Rol>("recepcionista")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [pendiente, start] = useTransition()

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a una persona</DialogTitle>
          <DialogDescription>Le llega un email para crear su contraseña y entrar al gimnasio.</DialogDescription>
        </DialogHeader>
        <form
          id="form-invitar"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const r = usuarioInvitacionSchema.safeParse({ nombre, email, rol })
            if (!r.success) return setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
            setErrores({})
            start(async () => {
              const res = await invitarUsuario(r.data)
              if (!res.ok) return void toast.error(res.error)
              toast.success(`Invitación enviada a ${r.data.email}.`)
              cerrar()
              setNombre("")
              setEmail("")
            })
          }}
        >
          <Field label="Nombre y apellido" htmlFor="inv-nombre" error={errores.nombre}>
            <Input id="inv-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </Field>
          <Field label="Email" htmlFor="inv-email" error={errores.email}>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Rol" htmlFor="inv-rol" hint={ROLES[rol].descripcion}>
            <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
              <SelectTrigger id="inv-rol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLES) as Rol[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLES[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-invitar" disabled={pendiente}>
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
