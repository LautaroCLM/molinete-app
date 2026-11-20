"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, Clock, Info, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Disco, ESTILO_ESTADO } from "@/components/shared/estado-badge"
import { LogoMarca } from "@/components/layout/logo"
import { BotonInstalarApp } from "@/components/layout/boton-instalar"
import { toast } from "sonner"
import { EntrenamientoVista } from "./entrenamiento"
import { RutinaPropiaEditor } from "./rutina-propia-editor"
import { PerfilVista, PinPantalla } from "./perfil-socio"
import {
  abrirPerfil,
  crearPin,
  desvincularDispositivo,
  estadoPerfil,
  ingresarConDispositivo,
  ingresarConDni,
  cargarHistorial,
  cargarProgreso,
  cargarRecords,
  cargarBiblioteca,
  guardarRutinaPropia,
  eliminarRutinaPropia,
  type EjercicioBibliotecaSocio,
  guardarEntrenamiento,
  type Historial,
  type PerfilSocio,
  type RutinaPerfil,
  type ResultadoPerfil,
  type ResultadoQR,
} from "@/lib/actions/qr"
import { cn } from "@/lib/utils"

type Listo = Extract<ResultadoQR, { ok: true }>
type Vista =
  | { tipo: "cargando" }
  | { tipo: "dni"; error?: string }
  | { tipo: "listo"; r: Listo }
  | { tipo: "pin"; dispositivo: string; r: Listo | null; modo: "crear" | "entrar"; error?: string; bloqueado: boolean }
  | { tipo: "perfil"; dispositivo: string; r: Listo | null; perfil: PerfilSocio; pin: string }
  | { tipo: "entrenando"; dispositivo: string; r: Listo | null; perfil: PerfilSocio; pin: string; rutina: RutinaPerfil; diaIdx: number; historial: Historial }
  | { tipo: "editando"; dispositivo: string; r: Listo | null; perfil: PerfilSocio; pin: string; rutina: RutinaPerfil | null; biblioteca: EjercicioBibliotecaSocio[] }
  | { tipo: "sin-dispositivo" }
  | { tipo: "error"; mensaje: string }

const MSG_BLOQUEADO = "Tu perfil está bloqueado por varios intentos. Probá más tarde o pedí en recepción que restablezcan tu PIN."
/** Minutos en segundo plano tras los cuales el perfil se vuelve a bloquear con el PIN. */
const AUTOBLOQUEO_MIN = 5

const clave = (gymId: string) => `molinete:ingreso:${gymId}`

function leer(gymId: string): string | null {
  try {
    return localStorage.getItem(clave(gymId))
  } catch {
    return null
  }
}
function guardar(gymId: string, valor: string | null) {
  try {
    if (valor) localStorage.setItem(clave(gymId), valor)
    else localStorage.removeItem(clave(gymId))
  } catch {
    // Navegador sin almacenamiento (modo privado): se pedirá el DNI cada vez.
  }
}

export function IngresoQR({ token, gymId, gymNombre, modoApp }: { token: string; gymId: string; gymNombre: string; modoApp: boolean }) {
  const [vista, setVista] = useState<Vista>({ tipo: "cargando" })
  const [pendiente, start] = useTransition()

  function mostrar(r: ResultadoQR) {
    if (r.ok) {
      guardar(gymId, r.dispositivo)
      setVista({ tipo: "listo", r })
    } else if (r.codigo === "DISPOSITIVO_DESCONOCIDO") {
      guardar(gymId, null)
      setVista({ tipo: "dni" })
    } else if (r.codigo === "NO_ENCONTRADO" || r.codigo === "DNI" || r.codigo === "DEMASIADOS_INTENTOS") {
      setVista({ tipo: "dni", error: r.mensaje })
    } else {
      setVista({ tipo: "error", mensaje: r.mensaje })
    }
  }

  useEffect(() => {
    const disp = leer(gymId)
    let vigente = true
    if (modoApp) {
      // App instalada: abre en el PIN/perfil. NO registra asistencia (eso es solo al escanear el QR).
      const tareaApp = disp ? estadoPerfil(token, disp) : Promise.resolve(null)
      tareaApp.then((e) => {
        if (!vigente) return
        if (!e || !disp) {
          setVista({ tipo: "sin-dispositivo" })
          return
        }
        if (!e.ok) {
          if (e.codigo === "DISPOSITIVO_DESCONOCIDO") {
            guardar(gymId, null)
            setVista({ tipo: "sin-dispositivo" })
          } else setVista({ tipo: "error", mensaje: e.mensaje })
          return
        }
        setVista({ tipo: "pin", dispositivo: disp, r: null, modo: e.tienePin ? "entrar" : "crear", bloqueado: !!e.bloqueadoHasta, error: e.bloqueadoHasta ? MSG_BLOQUEADO : undefined })
      })
      return () => {
        vigente = false
      }
    }
    const tarea = disp ? ingresarConDispositivo(token, disp) : Promise.resolve(null)
    tarea.then((r) => {
      if (!vigente) return
      if (r) mostrar(r)
      else setVista({ tipo: "dni" })
    })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, gymId, modoApp])

  /** Si el celular ya no está vinculado (p. ej. el gimnasio restableció el PIN), vuelve a pedir el DNI. */
  function sesionPerdida() {
    guardar(gymId, null)
    setVista(modoApp ? { tipo: "sin-dispositivo" } : { tipo: "dni" })
  }

  function verPerfil(r: Listo) {
    start(async () => {
      const e = await estadoPerfil(token, r.dispositivo)
      if (!e.ok) return e.codigo === "DISPOSITIVO_DESCONOCIDO" ? sesionPerdida() : setVista({ tipo: "error", mensaje: e.mensaje })
      setVista({ tipo: "pin", dispositivo: r.dispositivo, r, modo: e.tienePin ? "entrar" : "crear", bloqueado: !!e.bloqueadoHasta, error: e.bloqueadoHasta ? MSG_BLOQUEADO : undefined })
    })
  }

  function enviarPin(actual: Extract<Vista, { tipo: "pin" }>, pin: string) {
    start(async () => {
      const f = actual.modo === "crear" ? crearPin : abrirPerfil
      const res: ResultadoPerfil = await f(token, actual.dispositivo, pin)
      if (res.ok) return setVista({ tipo: "perfil", dispositivo: actual.dispositivo, r: actual.r, perfil: res.perfil, pin })
      if (res.codigo === "DISPOSITIVO_DESCONOCIDO") return sesionPerdida()
      setVista({
        tipo: "pin",
        dispositivo: actual.dispositivo,
        r: actual.r,
        modo: res.codigo === "YA_TIENE_PIN" ? "entrar" : res.codigo === "SIN_PIN" ? "crear" : actual.modo,
        error: res.mensaje,
        bloqueado: res.codigo === "BLOQUEADO",
      })
    })
  }

  function empezarEntrenamiento(v: Extract<Vista, { tipo: "perfil" }>, rutina: RutinaPerfil, diaIdx: number) {
    start(async () => {
      const h = await cargarHistorial(token, v.dispositivo, v.pin)
      if (!h.ok) return h.codigo === "DISPOSITIVO_DESCONOCIDO" ? sesionPerdida() : void toast.error(h.mensaje)
      setVista({ tipo: "entrenando", dispositivo: v.dispositivo, r: v.r, perfil: v.perfil, pin: v.pin, rutina, diaIdx, historial: h.historial })
    })
  }

  /** Abre el armado de una rutina propia (nueva o la que ya tiene), trayendo la biblioteca del gimnasio para sugerir ejercicios. */
  function abrirEditor(v: Extract<Vista, { tipo: "perfil" }>, rutina: RutinaPerfil | null) {
    start(async () => {
      const b = await cargarBiblioteca(token, v.dispositivo, v.pin)
      if (!b.ok && b.codigo === "DISPOSITIVO_DESCONOCIDO") return sesionPerdida()
      setVista({ tipo: "editando", dispositivo: v.dispositivo, r: v.r, perfil: v.perfil, pin: v.pin, rutina, biblioteca: b.ok ? b.ejercicios : [] })
    })
  }

  /** Vuelve al perfil trayendo los datos de nuevo (para que se vea lo que cambió). */
  async function recargarPerfil(v: { dispositivo: string; r: Listo | null; perfil: PerfilSocio; pin: string }) {
    const res = await abrirPerfil(token, v.dispositivo, v.pin)
    setVista({ tipo: "perfil", dispositivo: v.dispositivo, r: v.r, perfil: res.ok ? res.perfil : v.perfil, pin: v.pin })
  }

  /** Vuelve al perfil, trayendo de nuevo los datos para que se vea el entrenamiento recién guardado. */
  function volverAlPerfil(v: Extract<Vista, { tipo: "entrenando" }>) {
    start(async () => {
      const res = await abrirPerfil(token, v.dispositivo, v.pin)
      setVista({ tipo: "perfil", dispositivo: v.dispositivo, r: v.r, perfil: res.ok ? res.perfil : v.perfil, pin: v.pin })
    })
  }

  function noSoyYo() {
    const disp = leer(gymId)
    guardar(gymId, null)
    if (disp) void desvincularDispositivo(disp)
    setVista(modoApp ? { tipo: "sin-dispositivo" } : { tipo: "dni" })
  }

  // Si la app queda en segundo plano un rato, el perfil vuelve a pedir el PIN.
  const enPerfil = vista.tipo === "perfil" ? vista : null
  useEffect(() => {
    if (!enPerfil) return
    let oculto: number | null = null
    const alCambiar = () => {
      if (document.visibilityState === "hidden") oculto = Date.now()
      else if (oculto && Date.now() - oculto > AUTOBLOQUEO_MIN * 60000) {
        oculto = null
        setVista({ tipo: "pin", dispositivo: enPerfil.dispositivo, r: enPerfil.r, modo: "entrar", bloqueado: false })
      }
    }
    document.addEventListener("visibilitychange", alCambiar)
    return () => document.removeEventListener("visibilitychange", alCambiar)
  }, [enPerfil])

  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center gap-2.5 bg-sidebar px-5 py-4 text-white [--logo-hole:var(--sidebar)]">
        <LogoMarca className="size-6" />
        <span className="truncate font-semibold">{gymNombre}</span>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        {vista.tipo === "cargando" && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground" role="status">
            {modoApp ? "Abriendo tu perfil…" : "Registrando tu ingreso…"}
          </div>
        )}

        {vista.tipo === "dni" && (
          <form
            method="post"
            className="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault()
              const dni = String(new FormData(e.currentTarget).get("dni") ?? "")
              start(async () => mostrar(await ingresarConDni(token, dni)))
            }}
          >
            <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight">Registrá tu ingreso</h1>
            <p className="mt-2 text-muted-foreground">Es solo la primera vez: después este celular te recuerda y alcanza con escanear el QR.</p>
            <label htmlFor="dni" className="mt-8 text-sm font-medium">
              Tu DNI
            </label>
            <Input
              id="dni"
              name="dni"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="Sin puntos"
              className="mt-1.5 h-14 text-center text-2xl font-semibold tracking-widest tabular-nums"
              maxLength={10}
            />
            {vista.error && (
              <p role="alert" className="mt-3 rounded-lg bg-bad-soft px-3 py-2.5 text-sm font-medium text-bad">
                {vista.error}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-6 h-14 text-lg" disabled={pendiente}>
              {pendiente ? "Registrando…" : "Registrar ingreso"}
            </Button>
            <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
              Solo guardamos en este celular un código para reconocerte. No se registran pagos.
            </p>
          </form>
        )}

        {vista.tipo === "listo" && <Resultado r={vista.r} noSoyYo={noSoyYo} verPerfil={() => verPerfil(vista.r)} pendiente={pendiente} />}

        {vista.tipo === "pin" && (
          <PinPantalla
            key={`${vista.modo}`}
            modo={vista.modo}
            error={vista.error}
            bloqueado={vista.bloqueado}
            pendiente={pendiente}
            onEnviar={(pin) => enviarPin(vista, pin)}
            onVolver={vista.r ? () => setVista({ tipo: "listo", r: vista.r! }) : undefined}
          />
        )}

        {vista.tipo === "perfil" && (
          <PerfilVista
            perfil={vista.perfil}
            etiquetaVolver={vista.r ? "Volver" : "Cerrar perfil"}
            onVolver={() =>
              vista.r
                ? setVista({ tipo: "listo", r: vista.r })
                : setVista({ tipo: "pin", dispositivo: vista.dispositivo, r: null, modo: "entrar", bloqueado: false })
            }
            onNoSoyYo={modoApp ? noSoyYo : undefined}
            onEmpezar={(rutina, diaIdx) => empezarEntrenamiento(vista, rutina, diaIdx)}
            onProgreso={() => cargarProgreso(token, vista.dispositivo, vista.pin)}
            onRecords={() => cargarRecords(token, vista.dispositivo, vista.pin)}
            onCrearRutina={() => abrirEditor(vista, null)}
            onEditarRutina={(rutina) => abrirEditor(vista, rutina)}
            onEliminarRutina={async (rutina) => {
              const r = await eliminarRutinaPropia(token, vista.dispositivo, vista.pin, rutina.id)
              if (!r.ok) return void toast.error(r.mensaje)
              toast.success("Rutina eliminada.")
              await recargarPerfil(vista)
            }}
            pendiente={pendiente}
          />
        )}

        {vista.tipo === "editando" && (
          <RutinaPropiaEditor
            key={vista.rutina?.id ?? "nueva"}
            rutina={vista.rutina}
            biblioteca={vista.biblioteca}
            onCancelar={() => setVista({ tipo: "perfil", dispositivo: vista.dispositivo, r: vista.r, perfil: vista.perfil, pin: vista.pin })}
            onGuardar={async (datos) => {
              const r = await guardarRutinaPropia(token, vista.dispositivo, vista.pin, datos, vista.rutina?.id)
              if (r.ok) {
                toast.success(vista.rutina ? "Rutina actualizada." : "¡Listo! Tu rutina quedó guardada.")
                await recargarPerfil(vista)
              }
              return r
            }}
          />
        )}

        {vista.tipo === "entrenando" && (
          <EntrenamientoVista
            key={`${vista.rutina.id}:${vista.diaIdx}`}
            gymId={gymId}
            socioId={vista.perfil.socioId}
            rutina={vista.rutina}
            diaIdx={vista.diaIdx}
            historial={vista.historial}
            onGuardar={(datos) => guardarEntrenamiento(token, vista.dispositivo, vista.pin, datos)}
            onSalir={() => setVista({ tipo: "perfil", dispositivo: vista.dispositivo, r: vista.r, perfil: vista.perfil, pin: vista.pin })}
            onTerminado={() => volverAlPerfil(vista)}
          />
        )}

        {vista.tipo === "sin-dispositivo" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Info className="size-8 text-muted-foreground" />
            <p className="text-lg font-medium">Todavía no vinculaste este celular</p>
            <p className="max-w-xs text-muted-foreground">
              La próxima vez que vengas a {gymNombre}, escaneá el QR de la entrada y registrá tu ingreso con tu DNI. Después vas a poder abrir tu perfil desde acá.
            </p>
          </div>
        )}

        {vista.tipo === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Info className="size-8 text-muted-foreground" />
            <p className="text-lg font-medium">{vista.mensaje}</p>
          </div>
        )}
      </div>
    </main>
  )
}

function Resultado({ r, noSoyYo, verPerfil, pendiente }: { r: Extract<ResultadoQR, { ok: true }>; noSoyYo: () => void; verPerfil: () => void; pendiente: boolean }) {
  const e = ESTILO_ESTADO[r.estado]
  return (
    <div className="flex flex-1 flex-col">
      <p className={cn("inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-semibold", r.yaRegistrado ? "bg-muted text-muted-foreground" : "bg-ok-soft text-ok")}>
        {r.yaRegistrado ? <Clock className="size-4" /> : <Check className="size-4" />}
        {r.yaRegistrado ? `Ya registraste tu ingreso a las ${r.hora}` : `Ingreso registrado ${r.hora}`}
      </p>

      <h1 className="mt-6 font-display text-5xl leading-none font-semibold tracking-tight">¡Hola, {r.nombre}!</h1>

      <section className={cn("mt-8 rounded-2xl p-6", e.fondo)}>
        <div className="flex items-start justify-between gap-4">
          <p className={cn("num-display text-5xl", e.texto)}>{r.titulo}</p>
          <Disco estado={r.estado} className="size-10 border-[10px]" />
        </div>
        <p className={cn("mt-3 text-lg font-medium", e.texto)}>{r.detalle}</p>
      </section>

      {r.recordatorio && (
        <p className="mt-4 rounded-xl border-2 border-dashed px-4 py-3.5 text-center text-lg font-semibold">{r.recordatorio}</p>
      )}

      <Button size="lg" className="mt-6 h-14 text-lg" onClick={verPerfil} disabled={pendiente}>
        <UserRound className="size-5" /> {pendiente ? "Abriendo…" : "Ver mi perfil"}
      </Button>
      <BotonInstalarApp className="mt-3 h-12" />

      <p className="mt-5 text-center text-muted-foreground">¡Buen entrenamiento!</p>

      <button onClick={noSoyYo} className="mt-auto pt-10 text-center text-sm text-muted-foreground underline underline-offset-4">
        No soy {r.nombre}
      </button>
    </div>
  )
}
