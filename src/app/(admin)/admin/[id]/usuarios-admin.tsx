"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Dices, KeyRound, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field } from "@/components/shared/field"
import { Panel } from "@/components/shared/page-header"
import { agregarUsuarioAdmin, cambiarEstadoUsuarioAdmin, restablecerContrasenaAdmin } from "@/lib/actions/admin"
import { ROLES } from "@/lib/labels"
import { hace } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Rol } from "@/types/domain"
import { CredencialCampos, credencialVacia, generarContrasena, type Credencial } from "../credencial-campos"

export interface UsuarioFila {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: Rol
  activo: boolean
  ultimo_acceso: string | null
}

export function UsuariosAdmin({ gymId, usuarios }: { gymId: string; usuarios: UsuarioFila[] }) {
  const [nuevo, setNuevo] = useState(false)
  const [clave, setClave] = useState<UsuarioFila | null>(null)
  const [pendiente, start] = useTransition()

  return (
    <Panel
      titulo="Usuarios"
      descripcion="Entran con su email y la contraseña que les des."
      accion={
        <Button onClick={() => setNuevo(true)}>
          <UserPlus /> Agregar usuario
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
                <p className="font-medium">
                  {u.nombre} {u.apellido}
                  {!u.activo && <span className="ml-2 rounded-full bg-off-soft px-2 py-0.5 text-xs font-semibold text-off">Desactivado</span>}
                </p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </TableCell>
              <TableCell>{ROLES[u.rol].label}</TableCell>
              <TableCell className="hidden text-muted-foreground first-letter:uppercase md:table-cell">{u.ultimo_acceso ? hace(u.ultimo_acceso) : "Nunca"}</TableCell>
              <TableCell className="pr-5 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => setClave(u)}>
                    <KeyRound /> Contraseña
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendiente}
                    onClick={() =>
                      start(async () => {
                        const r = await cambiarEstadoUsuarioAdmin(gymId, u.id, !u.activo)
                        if (r.ok) toast.success(u.activo ? `${u.nombre} ya no puede ingresar.` : `${u.nombre} puede volver a ingresar.`)
                        else toast.error(r.error)
                      })
                    }
                  >
                    {u.activo ? "Desactivar" : "Reactivar"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <NuevoUsuario gymId={gymId} abierto={nuevo} cerrar={() => setNuevo(false)} />
      <NuevaClave usuario={clave} cerrar={() => setClave(null)} />
    </Panel>
  )
}

function NuevoUsuario({ gymId, abierto, cerrar }: { gymId: string; abierto: boolean; cerrar: () => void }) {
  const [c, setC] = useState<Credencial>({ ...credencialVacia(), password: generarContrasena() })
  const [rol, setRol] = useState<Rol>("recepcionista")
  const [error, setError] = useState<string>()
  const [pendiente, start] = useTransition()

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Agregar usuario</DialogTitle>
          <DialogDescription>Anotá la contraseña antes de guardar: después no se puede ver.</DialogDescription>
        </DialogHeader>
        <form
          id="form-usuario-admin"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await agregarUsuarioAdmin(gymId, { ...c, rol })
              if (!r.ok) return setError(r.error)
              toast.success(`Usuario creado: ${c.email} / ${c.password}`, { duration: 15000 })
              setError(undefined)
              setC({ ...credencialVacia(), password: generarContrasena() })
              cerrar()
            })
          }}
        >
          <CredencialCampos valor={c} onChange={setC} prefijo="nuevo" />
          <Field label="Rol" htmlFor="nuevo-rol" hint={ROLES[rol].descripcion}>
            <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
              <SelectTrigger id="nuevo-rol" className="w-full sm:w-56">
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
          {error && (
            <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-usuario-admin" disabled={pendiente}>
            Crear usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NuevaClave({ usuario, cerrar }: { usuario: UsuarioFila | null; cerrar: () => void }) {
  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        {usuario && <FormClave key={usuario.id} usuario={usuario} cerrar={cerrar} />}
      </DialogContent>
    </Dialog>
  )
}

function FormClave({ usuario, cerrar }: { usuario: UsuarioFila; cerrar: () => void }) {
  const [password, setPassword] = useState("")
  const [pendiente, start] = useTransition()
  return (
    <>
      <DialogHeader>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogDescription>
          {usuario.nombre} {usuario.apellido} · {usuario.email}
        </DialogDescription>
      </DialogHeader>
      <Field
        label="Contraseña nueva"
        htmlFor="clave-nueva"
        hint="Reemplaza a la actual. La contraseña actual no se puede ver, solo cambiar. Anotá la nueva antes de guardar."
      >
        <div className="flex gap-2">
          <Input id="clave-nueva" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" autoComplete="off" autoFocus />
          <Button type="button" variant="outline" onClick={() => setPassword(generarContrasena())}>
            <Dices /> Generar
          </Button>
        </div>
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={cerrar}>
          Cancelar
        </Button>
        <Button
          disabled={pendiente || password.length < 8}
          onClick={() =>
            start(async () => {
              const r = await restablecerContrasenaAdmin(usuario.id, { password })
              if (!r.ok) return void toast.error(r.error)
              toast.success(`Contraseña cambiada: ${usuario.email} / ${password}`, { duration: 20000 })
              cerrar()
            })
          }
        >
          Cambiar contraseña
        </Button>
      </DialogFooter>
    </>
  )
}
