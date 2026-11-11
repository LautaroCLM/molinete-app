import { redirect } from "next/navigation"
import { LogoMarca } from "@/components/layout/logo"
import { getConfigQR, getSesion } from "@/lib/data"
import { puede } from "@/lib/permissions"
import { qrSvg, urlIngreso } from "@/lib/qr"
import { BotonImprimir } from "./boton-imprimir"

export const metadata = { title: "Cartel de ingreso" }

/** Cartel A4 para pegar en la entrada del gimnasio. */
export default async function CartelQRPage() {
  const { usuario, gym } = await getSesion()
  if (!puede(usuario.rol, "configuracion.ver")) redirect("/")
  const qr = await getConfigQR()
  const svg = await qrSvg(await urlIngreso(qr.token))

  return (
    <main className="min-h-svh bg-muted/40 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-6 flex max-w-[210mm] justify-end px-4 print:hidden">
        <BotonImprimir />
      </div>
      <article className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col items-center bg-white px-[14mm] py-[16mm] text-center text-[#161a22] shadow-sm print:shadow-none">
        <p className="font-display text-[11mm] leading-tight font-semibold">{gym.nombre}</p>
        <h1 className="mt-[8mm] font-display text-[19mm] leading-[0.95] font-bold tracking-tight">Registrá tu ingreso</h1>
        <p className="mt-[5mm] max-w-[150mm] text-[6mm] leading-snug">Escaneá el código con la cámara de tu celular cada vez que llegues.</p>
        <div className="mt-[10mm] w-[110mm] rounded-[6mm] border-[1.2mm] border-[#161a22] p-[5mm] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <ol className="mt-[10mm] flex w-full max-w-[160mm] flex-col gap-[3mm] text-left text-[5mm] leading-snug">
          <li>
            <strong>La primera vez</strong> escribí tu DNI. Tu celular queda recordado.
          </li>
          <li>
            <strong>Después</strong> solo escaneás y listo: ves cuántos días te quedan de cuota.
          </li>
          <li>
            <strong>Si pagás por clase</strong>, acordate de abonar en recepción.
          </li>
        </ol>
        <div className="mt-auto flex items-center gap-[2mm] text-[3.5mm] text-[#5c6573] [--logo-hole:#ffffff] [--logo-ring:#15803d]">
          <LogoMarca className="size-[6mm] text-[#161a22]" />
          Molinete
        </div>
      </article>
    </main>
  )
}
