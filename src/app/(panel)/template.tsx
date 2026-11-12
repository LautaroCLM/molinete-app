/** Se vuelve a montar en cada cambio de módulo: entrada suave del contenido. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="enter-fade">{children}</div>
}
