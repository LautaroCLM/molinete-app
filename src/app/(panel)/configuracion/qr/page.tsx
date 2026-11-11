import { Panel } from "@/components/shared/page-header"
import { QRControles } from "@/features/configuracion/qr-controles"
import { getConfigQR } from "@/lib/data"
import { qrSvg, urlIngreso } from "@/lib/qr"

export const metadata = { title: "Ingreso con QR" }

export default async function ConfigQRPage() {
  const qr = await getConfigQR()
  const url = await urlIngreso(qr.token)
  const svg = await qrSvg(url)

  return (
    <div className="flex flex-col gap-6">
      <Panel
        titulo="Ingreso con QR"
        descripcion="Pegá el cartel en la entrada. Cada socio lo escanea con su celular al llegar y queda registrada la asistencia, sin pasar por recepción."
      >
        <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
          <div
            className="aspect-square w-52 rounded-xl border bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
            role="img"
            aria-label="Código QR de ingreso"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="flex min-w-0 flex-col gap-5">
            <div>
              <p className="text-sm text-muted-foreground">Enlace del QR</p>
              <p className="mt-1 break-all font-medium">{url}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ingresos por QR hoy: <strong className="text-foreground">{qr.ingresosHoy}</strong>
              </p>
            </div>
            <QRControles activo={qr.activo} url={url} />
          </div>
        </div>
      </Panel>

      <Panel titulo="Cómo funciona para el socio">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground marker:font-semibold marker:text-foreground">
          <li>Escanea el QR con la cámara del celular.</li>
          <li>La primera vez escribe su DNI. El celular queda vinculado y no se lo vuelve a pedir.</li>
          <li>Ve su nombre de pila y el estado de la cuota (días que le quedan o si está vencida). Ningún otro dato personal.</li>
          <li>Si paga por clase, le aparece “Acordate de abonar en recepción”. El QR nunca registra pagos.</li>
          <li>Si vuelve a escanear dentro de las 3 horas, no se cuenta dos veces.</li>
        </ol>
      </Panel>
    </div>
  )
}
