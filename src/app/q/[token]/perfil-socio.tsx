"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Delete, Dumbbell, IdCard, Mail, Phone, ShieldCheck } from "lucide-react"
import { Disco, ESTILO_ESTADO } from "@/components/shared/estado-badge"
import { SocioAvatar } from "@/components/shared/socio-avatar"
import { CalendarioAsistencias } from "@/features/socios/calendario-asistencias"
import { fecha } from "@/lib/format"
import type { PerfilSocio, RutinaPerfil } from "@/lib/actions/qr"
import { cn } from "@/lib/utils"

/** Pantalla del PIN: elegirlo (primera vez, dos veces) o ingresarlo. */
export function PinPantalla({
  modo,
  error,
  bloqueado,
  pendiente,
  onEnviar,
  onVolver,
}: {
  modo: "crear" | "entrar"
  error?: string
  bloqueado: boolean
  pendiente: boolean
  onEnviar: (pin: string) => void
  onVolver: () => void
}) {
  const [pin, setPin] = useState("")
  const [primero, setPrimero] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | undefined>()
  const deshabilitado = pendiente || bloqueado

  function digito(d: string) {
    if (deshabilitado) return
    setAviso(undefined)
    setPin((p) => (p.length < 4 ? p + d : p))
  }
  const borrar = () => !deshabilitado && setPin((p) => p.slice(0, -1))

  // Con 4 dígitos se envía solo (o se pide repetir al crear el PIN).
  useEffect(() => {
    if (pin.length !== 4) return
    if (modo === "crear" && primero === null) {
      const t = setTimeout(() => {
        setPrimero(pin)
        setPin("")
      }, 150)
      return () => clearTimeout(t)
    }
    if (modo === "crear" && primero !== null && primero !== pin) {
      const t = setTimeout(() => {
        setPrimero(null)
        setPin("")
        setAviso("Los PIN no coinciden. Elegí uno de nuevo.")
      }, 250)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      onEnviar(pin)
      setPin("")
    }, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  // Teclado físico (compu) además del teclado de pantalla.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) digito(e.key)
      else if (e.key === "Backspace") borrar()
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deshabilitado])

  const titulo = modo === "entrar" ? "Ingresá tu PIN" : primero === null ? "Elegí tu PIN" : "Repetí tu PIN"
  const mensaje = error ?? aviso

  return (
    <div className="flex flex-1 flex-col">
      <button onClick={onVolver} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver
      </button>

      <div className="mt-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-ok-soft text-ok">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-4xl leading-tight font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-muted-foreground">
          {modo === "crear"
            ? "Son 4 números. Con este PIN vas a ver tu perfil; solo lo sabés vos."
            : "Es el PIN que elegiste la primera vez."}
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-4" role="status" aria-label={`${pin.length} de 4 dígitos`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("size-4 rounded-full border-2 transition-colors", i < pin.length ? "border-primary bg-primary" : "border-muted-foreground/40")} />
        ))}
      </div>

      <p role="alert" className={cn("mx-auto mt-5 min-h-12 max-w-xs text-center text-sm font-medium", mensaje ? "text-bad" : "text-transparent")}>
        {mensaje ?? "."}
      </p>

      <div className="mx-auto mt-2 grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Tecla key={d} onClick={() => digito(d)} disabled={deshabilitado}>
            {d}
          </Tecla>
        ))}
        <span />
        <Tecla onClick={() => digito("0")} disabled={deshabilitado}>
          0
        </Tecla>
        <Tecla onClick={borrar} disabled={deshabilitado} etiqueta="Borrar">
          <Delete className="size-6" />
        </Tecla>
      </div>
    </div>
  )
}

function Tecla({ children, onClick, disabled, etiqueta }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; etiqueta?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className="grid h-16 place-items-center rounded-2xl border bg-card text-2xl font-semibold tabular-nums transition-[transform,background-color] duration-150 ease-(--ease-out) hover:bg-muted active:scale-95 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

/** Perfil del socio: su estado, constancia, pagos (sin montos) y sus datos enmascarados. */
export function PerfilVista({ perfil, onVolver }: { perfil: PerfilSocio; onVolver: () => void }) {
  const e = ESTILO_ESTADO[perfil.estado]
  const ultimos30 = perfil.ultimos30
  const datos = [
    { icono: <IdCard className="size-4" />, etiqueta: "DNI", valor: perfil.dni },
    { icono: <Phone className="size-4" />, etiqueta: "Teléfono", valor: perfil.telefono },
    { icono: <Mail className="size-4" />, etiqueta: "Email", valor: perfil.email },
  ].filter((d) => d.valor)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <button onClick={onVolver} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver
      </button>

      <div className="flex items-center gap-4">
        <SocioAvatar id={perfil.socioId} className="size-20" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight">
            {perfil.nombre} {perfil.apellido}
          </h1>
          <p className="text-muted-foreground">
            {perfil.plan ?? "Sin plan"}
            {perfil.fechaAlta && ` · socio desde el ${fecha(perfil.fechaAlta)}`}
          </p>
        </div>
      </div>

      <section className={cn("rounded-2xl p-5", e.fondo)}>
        <div className="flex items-start justify-between gap-4">
          <p className={cn("num-display text-4xl", e.texto)}>{perfil.titulo}</p>
          <Disco estado={perfil.estado} className="size-8 border-[8px]" />
        </div>
        <p className={cn("mt-2 font-medium", e.texto)}>{perfil.detalle}</p>
        {perfil.vencimiento && perfil.estado !== "por_clase" && (
          <p className="mt-3 border-t border-current/10 pt-3 text-sm text-muted-foreground">
            {perfil.estado === "vencido" || perfil.estado === "en_gracia" ? "Venció" : "Vence"} el{" "}
            <strong className="text-foreground">{fecha(perfil.vencimiento)}</strong>
          </p>
        )}
      </section>
      {perfil.recordatorio && <p className="rounded-xl border-2 border-dashed px-4 py-3 text-center font-semibold">{perfil.recordatorio}</p>}

      {perfil.rutinas.length > 0 && <SeccionRutinas rutinas={perfil.rutinas} />}

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Tus asistencias</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {ultimos30 === 0 ? "No viniste en los últimos 30 días." : `${ultimos30} ${ultimos30 === 1 ? "vez" : "veces"} en los últimos 30 días.`}
        </p>
        <div className="mt-4">
          <CalendarioAsistencias fechas={perfil.asistencias} />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Tus pagos</h2>
        {perfil.pagos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {perfil.pagos.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="block font-medium">{p.plan ?? "Pago"}</span>
                  <span className="text-xs text-muted-foreground">{fecha(p.fecha)}</span>
                </span>
                {p.hasta && <span className="text-right text-xs text-muted-foreground">Cubre hasta el {fecha(p.hasta)}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {datos.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Tus datos</h2>
          <dl className="mt-2 flex flex-col gap-2.5 text-sm">
            {datos.map((d) => (
              <div key={d.etiqueta} className="flex items-center gap-3">
                <span className="text-muted-foreground">{d.icono}</span>
                <dt className="w-16 text-muted-foreground">{d.etiqueta}</dt>
                <dd className="font-medium tabular-nums">{d.valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Por tu seguridad se muestran ocultos en parte. Para cambiarlos, pedilo en recepción.</p>
        </section>
      )}
    </div>
  )
}

/** Rutinas del socio: arranca en el día que le toca hoy y puede mirar cualquier otro. */
function SeccionRutinas({ rutinas }: { rutinas: RutinaPerfil[] }) {
  const [ri, setRi] = useState(0)
  const rutina = rutinas[ri] ?? rutinas[0]
  // Día elegido por rutina: sin elegir, el que le toca hoy.
  const [elegidos, setElegidos] = useState<Record<string, number>>({})
  const di = Math.min(elegidos[rutina.id] ?? rutina.hoy, Math.max(rutina.dias.length - 1, 0))
  const dia = rutina.dias[di]
  const esHoy = di === rutina.hoy

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Dumbbell className="size-4 text-primary" /> Tu rutina
      </h2>

      {rutinas.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Tus rutinas">
          {rutinas.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={i === ri}
              onClick={() => setRi(i)}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", i === ri ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {r.nombre}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 font-medium">{rutina.nombre}</p>
      {rutina.descripcion && <p className="text-sm text-muted-foreground">{rutina.descripcion}</p>}

      {rutina.dias.length > 0 && dia ? (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Hoy te toca: <strong className="text-foreground">{rutina.dias[rutina.hoy]?.nombre}</strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Días de la rutina">
            {rutina.dias.map((d, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === di}
                onClick={() => setElegidos((e) => ({ ...e, [rutina.id]: i }))}
                className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors", i === di ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {d.nombre}
                {i === rutina.hoy && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold text-primary-foreground">HOY</span>}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold">
            {dia.nombre}
            {!esHoy && <span className="ml-2 font-normal text-muted-foreground">(no es el de hoy)</span>}
          </p>
          {dia.ejercicios.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Este día todavía no tiene ejercicios cargados.</p>
          ) : (
            <ol className="mt-2 flex flex-col gap-2">
              {dia.ejercicios.map((e, i) => (
                <li key={i} className="rounded-xl bg-muted/50 px-3.5 py-3">
                  <p className="font-medium">
                    <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                    {e.nombre}
                  </p>
                  {(e.series || e.repeticiones || e.descanso) && (
                    <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                      {[e.series && `${e.series} series`, e.repeticiones && `${e.repeticiones} reps`, e.descanso && `descanso ${e.descanso}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {e.nota && <p className="mt-1 text-sm">{e.nota}</p>}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Esta rutina todavía no tiene días cargados.</p>
      )}
    </section>
  )
}
