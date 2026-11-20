"use client"

import { BotonVideo } from "@/components/shared/video-tecnica"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { ArrowLeft, ChartLine, Delete, Dumbbell, Flame, IdCard, Mail, Pencil, Phone, Play, Plus, ShieldCheck, Trash2, Trophy } from "lucide-react"
import { Disco, ESTILO_ESTADO } from "@/components/shared/estado-badge"
import { SocioAvatar } from "@/components/shared/socio-avatar"
import { CalendarioAsistencias } from "@/features/socios/calendario-asistencias"
import { fecha, num } from "@/lib/format"
import type { PerfilSocio, ProgresoEjercicio, RecordEjercicio, ResultadoProgreso, ResultadoRecords, RutinaPerfil } from "@/lib/actions/qr"
import { GraficoProgreso } from "./grafico-progreso"
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
  onVolver?: () => void
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
      {onVolver && (
        <button onClick={onVolver} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Volver
        </button>
      )}

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
export function PerfilVista({
  perfil,
  bienvenida,
  onVolver,
  etiquetaVolver = "Volver",
  onNoSoyYo,
  onEmpezar,
  onProgreso,
  onRecords,
  onCrearRutina,
  onEditarRutina,
  onEliminarRutina,
  pendiente = false,
}: {
  perfil: PerfilSocio
  bienvenida?: string | null
  onVolver: () => void
  etiquetaVolver?: string
  onNoSoyYo?: () => void
  onEmpezar?: (rutina: RutinaPerfil, diaIdx: number) => void
  onProgreso?: () => Promise<ResultadoProgreso>
  onRecords?: () => Promise<ResultadoRecords>
  onCrearRutina?: () => void
  onEditarRutina?: (rutina: RutinaPerfil) => void
  onEliminarRutina?: (rutina: RutinaPerfil) => Promise<void>
  pendiente?: boolean
}) {
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
        <ArrowLeft className="size-4" /> {etiquetaVolver}
      </button>

      {bienvenida && <p className="rounded-xl border-l-4 border-primary bg-muted/50 px-4 py-3 text-sm font-medium">{bienvenida}</p>}

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
          {perfil.rachaSemanas > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-bold text-warn">
              <Flame className="size-3.5" /> {perfil.rachaSemanas} {perfil.rachaSemanas === 1 ? "semana seguida" : "semanas seguidas"}
            </p>
          )}
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

      {(perfil.rutinas.length > 0 || onCrearRutina) && (
        <SeccionRutinas rutinas={perfil.rutinas} onEmpezar={onEmpezar} onCrear={onCrearRutina} onEditar={onEditarRutina} onEliminar={onEliminarRutina} pendiente={pendiente} />
      )}

      {perfil.entrenamientos.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Tus entrenamientos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {perfil.entrenamientos30 === 0 ? "Ninguno en los últimos 30 días." : `${perfil.entrenamientos30} ${perfil.entrenamientos30 === 1 ? "registrado" : "registrados"} en los últimos 30 días.`}
          </p>
          <ul className="mt-2 divide-y">
            {perfil.entrenamientos.slice(0, 5).map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.dia || "Entrenamiento"}</span>
                  <span className="text-xs text-muted-foreground">
                    {fecha(t.fecha)} · {t.series} {t.series === 1 ? "serie" : "series"}
                    {t.volumen > 0 && ` · ${num(t.volumen)} kg`}
                  </span>
                </span>
                {t.records > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn">
                    <Trophy className="size-3" /> {t.records}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {onProgreso && <SeccionProgreso onProgreso={onProgreso} />}
          {onRecords && <SeccionRecords onRecords={onRecords} />}
        </section>
      )}

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

      {onNoSoyYo && (
        <button onClick={onNoSoyYo} className="pb-2 text-center text-sm text-muted-foreground underline underline-offset-4">
          No soy {perfil.nombre}
        </button>
      )}
    </div>
  )
}

/** Rutinas del socio: arranca en el día que le toca hoy y puede mirar cualquier otro. */
function SeccionRutinas(props: {
  rutinas: RutinaPerfil[]
  onEmpezar?: (rutina: RutinaPerfil, diaIdx: number) => void
  onCrear?: () => void
  onEditar?: (rutina: RutinaPerfil) => void
  onEliminar?: (rutina: RutinaPerfil) => Promise<void>
  pendiente: boolean
}) {
  if (props.rutinas.length > 0) return <RutinasConDatos {...props} />
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Dumbbell className="size-4 text-primary" /> Tu rutina
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">Todavía no tenés una rutina. Armá la tuya o pedile una a tu entrenador.</p>
      {props.onCrear && (
        <Button type="button" className="mt-4 w-full" size="lg" onClick={props.onCrear} disabled={props.pendiente}>
          <Plus className="size-5" /> Crear mi rutina
        </Button>
      )}
    </section>
  )
}

function RutinasConDatos({
  rutinas,
  onEmpezar,
  onCrear,
  onEditar,
  onEliminar,
  pendiente,
}: {
  rutinas: RutinaPerfil[]
  onEmpezar?: (rutina: RutinaPerfil, diaIdx: number) => void
  onCrear?: () => void
  onEditar?: (rutina: RutinaPerfil) => void
  onEliminar?: (rutina: RutinaPerfil) => Promise<void>
  pendiente: boolean
}) {
  const [confirmando, setConfirmando] = useState(false)
  const propias = rutinas.filter((r) => r.propia).length
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

      {(rutinas.length > 1 || rutinas.some((r) => r.propia || r.del_gimnasio)) && (
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Tus rutinas">
          {rutinas.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={i === ri}
              onClick={() => {
                setRi(i)
                setConfirmando(false)
              }}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", i === ri ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {r.nombre}
              {r.propia && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground">MÍA</span>}
              {r.del_gimnasio && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground">GIMNASIO</span>}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{rutina.nombre}</p>
          {rutina.descripcion && <p className="text-sm text-muted-foreground">{rutina.descripcion}</p>}
          {rutina.propia && <p className="mt-0.5 text-xs text-muted-foreground">Armada por vos. Solo la ves vos.</p>}
          {rutina.del_gimnasio && <p className="mt-0.5 text-xs text-muted-foreground">Rutina del gimnasio, para todos los socios.</p>}
        </div>
        {rutina.propia && onEditar && (
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar mi rutina" onClick={() => onEditar(rutina)}>
              <Pencil />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Eliminar mi rutina" onClick={() => setConfirmando(true)}>
              <Trash2 />
            </Button>
          </div>
        )}
      </div>
      {confirmando && rutina.propia && onEliminar && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-bad/30 bg-bad-soft px-3 py-2.5 text-sm">
          <span className="flex-1 font-medium text-bad">¿Eliminar “{rutina.nombre}”? No se puede deshacer.</span>
          <Button type="button" size="sm" variant="destructive" disabled={pendiente} onClick={async () => { await onEliminar(rutina); setConfirmando(false) }}>
            Eliminar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      )}

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
                  {e.video && <BotonVideo url={e.video} nombre={e.nombre} className="mt-2" />}
                </li>
              ))}
            </ol>
          )}
          {onEmpezar && dia.ejercicios.length > 0 && (
            <Button size="lg" className="mt-4 h-14 w-full text-lg" onClick={() => onEmpezar(rutina, di)} disabled={pendiente}>
              <Play className="size-5" /> {pendiente ? "Abriendo…" : esHoy ? "Empezar entrenamiento" : "Entrenar este día"}
            </Button>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Esta rutina todavía no tiene días cargados.</p>
      )}
      {onCrear && propias < 10 && (
        <Button type="button" variant="outline" className="mt-4 w-full" onClick={onCrear} disabled={pendiente}>
          <Plus className="size-4" /> Crear mi propia rutina
        </Button>
      )}
    </section>
  )
}

/** Botón "Ver mi progreso": carga la evolución por ejercicio y la muestra con un gráfico. */
function SeccionProgreso({ onProgreso }: { onProgreso: () => Promise<ResultadoProgreso> }) {
  const [estado, setEstado] = useState<{ tipo: "cerrado" } | { tipo: "cargando" } | { tipo: "listo"; ejercicios: ProgresoEjercicio[] } | { tipo: "error"; mensaje: string }>({ tipo: "cerrado" })
  const [elegido, setElegido] = useState(0)

  if (estado.tipo === "cerrado" || estado.tipo === "cargando" || estado.tipo === "error") {
    return (
      <div className="mt-3">
        <Button
          variant="outline"
          className="w-full"
          disabled={estado.tipo === "cargando"}
          onClick={async () => {
            setEstado({ tipo: "cargando" })
            const r = await onProgreso()
            setEstado(r.ok ? { tipo: "listo", ejercicios: r.ejercicios } : { tipo: "error", mensaje: r.mensaje })
          }}
        >
          <ChartLine className="size-4" /> {estado.tipo === "cargando" ? "Cargando…" : "Ver mi progreso"}
        </Button>
        {estado.tipo === "error" && (
          <p role="alert" className="mt-2 text-sm font-medium text-bad">
            {estado.mensaje}
          </p>
        )}
      </div>
    )
  }

  const ej = estado.ejercicios[elegido] ?? estado.ejercicios[0]
  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="font-semibold">Tu progreso</h3>
      {estado.ejercicios.length === 0 || !ej ? (
        <p className="mt-1 text-sm text-muted-foreground">Todavía no hay datos para mostrar.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-2" role="tablist" aria-label="Ejercicios">
            {estado.ejercicios.slice(0, 12).map((e, i) => (
              <button
                key={e.nombre}
                role="tab"
                aria-selected={i === elegido}
                onClick={() => setElegido(i)}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", i === elegido ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {e.nombre}
              </button>
            ))}
          </div>
          <GraficoProgreso key={ej.nombre} nombre={ej.nombre} puntos={ej.puntos} />
        </>
      )}
    </div>
  )
}

/** "Ver mis récords": la mejor marca de cada ejercicio (fuerza estimada y mayor peso) con su fecha. */
function SeccionRecords({ onRecords }: { onRecords: () => Promise<ResultadoRecords> }) {
  const [estado, setEstado] = useState<{ tipo: "cerrado" } | { tipo: "cargando" } | { tipo: "listo"; ejercicios: RecordEjercicio[] } | { tipo: "error"; mensaje: string }>({ tipo: "cerrado" })
  const kg = (n: number | null) => (n === null ? "—" : `${Math.round(n * 10) / 10}`.replace(".", ","))

  if (estado.tipo !== "listo") {
    return (
      <div className="mt-3">
        <Button
          variant="outline"
          className="w-full"
          disabled={estado.tipo === "cargando"}
          onClick={async () => {
            setEstado({ tipo: "cargando" })
            const r = await onRecords()
            setEstado(r.ok ? { tipo: "listo", ejercicios: r.ejercicios } : { tipo: "error", mensaje: r.mensaje })
          }}
        >
          <Trophy className="size-4" /> {estado.tipo === "cargando" ? "Cargando…" : "Ver mis récords"}
        </Button>
        {estado.tipo === "error" && (
          <p role="alert" className="mt-2 text-sm font-medium text-bad">
            {estado.mensaje}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <Trophy className="size-4 text-warn" /> Tus récords
      </h3>
      {estado.ejercicios.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Cuando registres pesos en tus entrenamientos, tus mejores marcas aparecen acá.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {estado.ejercicios.map((e) => (
            <li key={e.nombre} className="rounded-xl bg-muted/50 px-3.5 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{e.nombre}</p>
                {e.records > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn">
                    <Trophy className="size-3" /> {e.records} {e.records === 1 ? "récord" : "récords"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm tabular-nums">
                <span className="text-muted-foreground">Mejor marca:</span> <strong>{kg(e.mejorPeso)} kg</strong> × {e.repsMejorPeso ?? "—"} <span className="text-xs text-muted-foreground">({fecha(e.fechaMejorPeso)})</span>
              </p>
              <p className="text-sm tabular-nums">
                <span className="text-muted-foreground">Fuerza estimada:</span> <strong>{kg(e.e1rm)} kg</strong> <span className="text-xs text-muted-foreground">({kg(e.pesoE1rm)} × {e.repsE1rm ?? "—"}, {fecha(e.fechaE1rm)})</span>
              </p>
              <p className="text-xs text-muted-foreground">{e.sesiones} {e.sesiones === 1 ? "sesión" : "sesiones"} registradas</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
