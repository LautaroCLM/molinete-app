import { AvisoActualizacion } from "@/components/layout/aviso-actualizacion"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { PanelProvider } from "@/components/layout/panel-context"
import { BusquedaProvider } from "@/components/layout/command-search"
import { LlegadaDialog } from "@/features/asistencias/llegada-dialog"
import { CobroDialog } from "@/features/cobros/cobro-dialog"
import { VentaDialog } from "@/features/inventario/venta-dialog"
import { getCajaAbierta, getIndiceSocios, getPlanes, getProductos, getSesion } from "@/lib/data"

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion()
  const [socios, planes, productos, caja] = await Promise.all([
    getIndiceSocios(),
    getPlanes(),
    getProductos(),
    getCajaAbierta(sesion.usuario.id),
  ])

  return (
    <PanelProvider
      usuario={sesion.usuario}
      gym={sesion.gym}
      socios={socios}
      planes={planes}
      productos={productos}
      cajaAbierta={!!caja}
    >
      <BusquedaProvider>
        <div className="flex min-h-svh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
          </div>
        </div>
        <AvisoActualizacion />
        <LlegadaDialog />
        <CobroDialog />
        <VentaDialog />
      </BusquedaProvider>
    </PanelProvider>
  )
}
