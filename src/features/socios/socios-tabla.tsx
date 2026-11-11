"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDownUp, Search, MoreHorizontal, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EstadoBadge } from "@/components/shared/estado-badge"
import { usePanel } from "@/components/layout/panel-context"
import { dni, fecha, hace, normalizar } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FiltroSocios, SocioConEstado } from "@/lib/data"

const FILTROS: { id: FiltroSocios; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
  { id: "por_vencer", label: "Por vencer" },
  { id: "vencidos", label: "Vencidos" },
  { id: "inactivos", label: "Inactivos" },
]

function pasaFiltro(s: SocioConEstado, f: FiltroSocios) {
  const e = s.estado.estado
  if (f === "activos") return s.activo
  if (f === "por_vencer") return e === "por_vencer"
  if (f === "vencidos") return e === "vencido" || e === "en_gracia"
  if (f === "inactivos") return !s.activo
  return true
}

export function SociosTabla({ socios, filtroInicial }: { socios: SocioConEstado[]; filtroInicial: FiltroSocios }) {
  const [filtro, setFiltro] = useState<FiltroSocios>(filtroInicial)
  const [q, setQ] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const { abrir } = usePanel()
  const router = useRouter()

  const conteos = useMemo(
    () => Object.fromEntries(FILTROS.map((f) => [f.id, socios.filter((s) => pasaFiltro(s, f.id)).length])) as Record<FiltroSocios, number>,
    [socios],
  )

  const datos = useMemo(() => {
    const n = normalizar(q)
    return socios.filter(
      (s) => pasaFiltro(s, filtro) && (!n || normalizar(`${s.nombre} ${s.apellido} ${s.apellido} ${s.nombre} ${s.dni}`).includes(n)),
    )
  }, [socios, filtro, q])

  const columnas = useMemo<ColumnDef<SocioConEstado>[]>(
    () => [
      {
        id: "socio",
        accessorFn: (s) => `${s.apellido} ${s.nombre}`,
        header: "Socio",
        cell: ({ row: { original: s } }) => (
          <Link href={`/clientes/${s.id}`} className="block min-w-0 hover:underline">
            <span className="block truncate font-semibold">
              {s.apellido}, {s.nombre}
            </span>
            <span className="text-xs text-muted-foreground">DNI {dni(s.dni)}</span>
          </Link>
        ),
      },
      {
        id: "plan",
        accessorFn: (s) => s.plan?.nombre ?? "",
        header: "Plan",
        cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
      },
      {
        id: "estado",
        accessorFn: (s) => s.estado.dias ?? (s.estado.estado === "por_clase" ? 999 : -999),
        header: "Estado",
        cell: ({ row: { original: s } }) => (
          <div className="flex flex-col items-start gap-0.5">
            <EstadoBadge estado={s.estado.estado} />
            {s.vencimiento && s.estado.estado !== "inactivo" && (
              <span className="text-xs text-muted-foreground">
                {s.estado.estado === "vencido" || s.estado.estado === "en_gracia" ? "Venció" : "Vence"} {fecha(s.vencimiento)}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "ultima",
        accessorFn: (s) => s.ultimaAsistencia ?? "",
        header: "Última visita",
        cell: ({ row: { original: s } }) =>
          s.ultimaAsistencia ? (
            <span className="text-muted-foreground first-letter:uppercase">{hace(s.ultimaAsistencia)}</span>
          ) : (
            <span className="text-muted-foreground">Nunca</span>
          ),
      },
      {
        id: "telefono",
        accessorKey: "telefono",
        header: "Teléfono",
        enableSorting: false,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground tabular-nums">{getValue<string>()}</span>,
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        enableSorting: false,
        cell: ({ row: { original: s } }) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => abrir({ tipo: "llegada", socioId: s.id })}>
              Llegó
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => abrir({ tipo: "cobro", socioId: s.id })}>
              Cobrar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Más acciones para ${s.nombre} ${s.apellido}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="sm:hidden" onSelect={() => abrir({ tipo: "llegada", socioId: s.id })}>Registrar llegada</DropdownMenuItem>
                <DropdownMenuItem className="sm:hidden" onSelect={() => abrir({ tipo: "cobro", socioId: s.id })}>Cobrar</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/clientes/${s.id}`)}>Ver ficha</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/clientes/${s.id}/editar`)}>Editar datos</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={`https://wa.me/549${s.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    Escribir por WhatsApp
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [abrir, router],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const tabla = useReactTable({
    data: datos,
    columns: columnas,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    autoResetPageIndex: true,
  })

  function elegirFiltro(f: FiltroSocios) {
    setFiltro(f)
    const url = new URL(window.location.href)
    if (f === "todos") url.searchParams.delete("filtro")
    else url.searchParams.set("filtro", f)
    window.history.replaceState(null, "", url)
  }

  const pagina = tabla.getState().pagination
  const desde = datos.length === 0 ? 0 : pagina.pageIndex * pagina.pageSize + 1
  const hasta = Math.min(datos.length, (pagina.pageIndex + 1) * pagina.pageSize)

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filtrar socios" className="flex gap-1 overflow-x-auto">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filtro === f.id}
              onClick={() => elegirFiltro(f.id)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                filtro === f.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span className={cn("text-xs tabular-nums", filtro === f.id ? "opacity-70" : "opacity-60")}>{conteos[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o DNI"
            className="pr-9 pl-9"
            aria-label="Buscar socios"
            autoFocus
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          {tabla.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  className={cn(
                    "h-10 text-xs text-muted-foreground first:pl-4 last:pr-4",
                    (h.column.id === "telefono" || h.column.id === "ultima") && "hidden xl:table-cell",
                    h.column.id === "plan" && "hidden md:table-cell",
                  )}
                >
                  {h.column.getCanSort() ? (
                    <button onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-foreground">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <ArrowDownUp className={cn("size-3", h.column.getIsSorted() ? "opacity-100" : "opacity-40")} />
                    </button>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {tabla.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnas.length} className="py-12 text-center text-muted-foreground">
                {q ? `No hay socios que coincidan con “${q}”.` : "No hay socios en este filtro."}
              </TableCell>
            </TableRow>
          ) : (
            tabla.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className={cn(!row.original.activo && "opacity-60")}>
                {row.getVisibleCells().map((c) => (
                  <TableCell
                    key={c.id}
                    className={cn(
                      "py-2.5 first:pl-4 last:pr-4",
                      (c.column.id === "telefono" || c.column.id === "ultima") && "hidden xl:table-cell",
                      c.column.id === "plan" && "hidden md:table-cell",
                    )}
                  >
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
        <span>
          {desde}–{hasta} de {datos.length} socios
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => tabla.previousPage()} disabled={!tabla.getCanPreviousPage()} aria-label="Página anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => tabla.nextPage()} disabled={!tabla.getCanNextPage()} aria-label="Página siguiente">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
