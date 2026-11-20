import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { LogoMarca } from "@/components/layout/logo"
import { getIndiceSocios, getRutina, getSesion } from "@/lib/data"
import { fecha } from "@/lib/format"
import { BotonImprimir } from "../../cartel-qr/boton-imprimir"

export const metadata = { title: "Imprimir rutina" }

/** Hoja A4 con la rutina para entregar en papel: cada día con sus ejercicios y casilleros para anotar los pesos a mano. */
export default async function ImprimirRutinaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ socio?: string }> }) {
  const { id } = await params
  const { socio: socioId } = await searchParams
  const [{ gym }, rutina] = await Promise.all([getSesion(), getRutina(id)])
  if (!rutina) notFound()
  const socio = socioId ? (await getIndiceSocios()).find((s) => s.id === socioId) : undefined

  return (
    <main className="min-h-svh bg-muted/40 py-8 print:bg-white print:py-0">
      <style>{"@page { size: A4; margin: 12mm; }"}</style>
      <div className="mx-auto mb-6 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <Link href="/rutinas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Rutinas
        </Link>
        <BotonImprimir />
      </div>

      <article className="mx-auto w-full max-w-[210mm] bg-white px-[12mm] py-[12mm] text-[#161a22] shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-[0.6mm] border-[#161a22] pb-[4mm]">
          <div className="min-w-0">
            <p className="font-display text-[8mm] leading-tight font-semibold">{gym.nombre}</p>
            <h1 className="mt-[1mm] font-display text-[6.5mm] leading-tight font-semibold">{rutina.nombre}</h1>
            {rutina.descripcion && <p className="mt-[1mm] text-[3.6mm] text-[#5c6573]">{rutina.descripcion}</p>}
          </div>
          <div className="shrink-0 text-right text-[3.8mm] leading-relaxed">
            <p>
              <span className="text-[#5c6573]">Socio: </span>
              {socio ? <strong>{`${socio.apellido}, ${socio.nombre}`}</strong> : <span className="inline-block w-[48mm] border-b border-[#161a22]/50">&nbsp;</span>}
            </p>
            <p>
              <span className="text-[#5c6573]">Fecha: </span>
              <strong>{fecha(new Date())}</strong>
            </p>
          </div>
        </header>

        {rutina.dias.map((dia, i) => (
          <section key={i} className="mt-[6mm] break-inside-avoid">
            <h2 className="rounded-[1.5mm] bg-[#161a22] px-[3mm] py-[1.4mm] font-display text-[5mm] font-semibold text-white print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">{dia.nombre}</h2>
            {dia.ejercicios.length === 0 ? (
              <p className="mt-[2mm] text-[3.6mm] text-[#5c6573]">Sin ejercicios cargados.</p>
            ) : (
              <table className="mt-[1.5mm] w-full border-collapse text-[3.6mm]">
                <thead>
                  <tr className="text-left text-[3mm] text-[#5c6573]">
                    <th className="w-[7mm] border-b border-[#161a22]/40 py-[1mm] font-medium">#</th>
                    <th className="border-b border-[#161a22]/40 py-[1mm] font-medium">Ejercicio</th>
                    <th className="w-[14mm] border-b border-[#161a22]/40 py-[1mm] text-center font-medium">Series</th>
                    <th className="w-[16mm] border-b border-[#161a22]/40 py-[1mm] text-center font-medium">Reps</th>
                    <th className="w-[19mm] border-b border-[#161a22]/40 py-[1mm] text-center font-medium">Descanso</th>
                    <th className="w-[44mm] border-b border-[#161a22]/40 py-[1mm] text-center font-medium" colSpan={4}>
                      Kg (anotá a mano)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dia.ejercicios.map((e, j) => (
                    <tr key={j} className="break-inside-avoid align-top">
                      <td className="border-b border-[#161a22]/25 py-[1.6mm] text-[#5c6573] tabular-nums">{j + 1}</td>
                      <td className="border-b border-[#161a22]/25 py-[1.6mm] pr-[2mm]">
                        <span className="font-semibold">{e.nombre}</span>
                        {e.nota && <span className="block text-[3.1mm] leading-snug text-[#5c6573]">{e.nota}</span>}
                      </td>
                      <td className="border-b border-[#161a22]/25 py-[1.6mm] text-center tabular-nums">{e.series}</td>
                      <td className="border-b border-[#161a22]/25 py-[1.6mm] text-center tabular-nums">{e.repeticiones}</td>
                      <td className="border-b border-[#161a22]/25 py-[1.6mm] text-center tabular-nums">{e.descanso}</td>
                      {[0, 1, 2, 3].map((k) => (
                        <td key={k} className="w-[11mm] border-b border-l border-[#161a22]/25 py-[1.6mm]">
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        <footer className="mt-[8mm] flex items-center justify-between gap-4 border-t border-[#161a22]/30 pt-[3mm] text-[3.2mm] text-[#5c6573]">
          <span>
            {gym.nombre}
            {gym.telefono && ` · ${gym.telefono}`}
          </span>
          <span className="flex items-center gap-[1.5mm] [--logo-hole:#ffffff]">
            <LogoMarca className="size-[5mm]" />
            Molinete
          </span>
        </footer>
      </article>
    </main>
  )
}
