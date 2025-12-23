import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Save } from 'lucide-react'
import { fetchAggregatedStatus, fetchCapexRows, upsertForecastRows } from '../data/client'
import { fallbackAggregates, fallbackRows } from '../data/fallback'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { formatMUSD } from '../lib/utils'
import type { ProjectRow } from '../types'

const FUTURE_MONTHS = [9, 10, 11, 12]

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')

  const capexQuery = useQuery({ queryKey: ['capex'], queryFn: fetchCapexRows, retry: false })
  const aggregateQuery = useQuery({ queryKey: ['aggregates'], queryFn: fetchAggregatedStatus, retry: false })

  const capexRows = capexQuery.data ?? fallbackRows
  const aggregates = aggregateQuery.data ?? fallbackAggregates
  const isLoading = capexQuery.isLoading || aggregateQuery.isLoading
  const hasError = capexQuery.error || aggregateQuery.error

  const [drafts, setDrafts] = useState<Record<string, number>>({})

  const projectsGrouped = useMemo(() => {
    const map: Record<string, { nombre_proyecto: string; segmento: string; categoria: string; responsable: string; rows: ProjectRow[]; status: boolean }> = {}
    capexRows.forEach((row) => {
      if (!map[row.nombre_proyecto]) {
        map[row.nombre_proyecto] = {
          nombre_proyecto: row.nombre_proyecto,
          segmento: row.segmento,
          categoria: row.categoria,
          responsable: row.responsable_3,
          rows: [],
          status: false,
        }
      }
      map[row.nombre_proyecto].rows.push(row)
    })
    aggregates.forEach((agg) => {
      if (map[agg.nombre_proyecto]) {
        map[agg.nombre_proyecto].status = agg.forecast_ready
      }
    })
    return Object.values(map)
  }, [capexRows, aggregates])

  const uniqueAreas = Array.from(new Set(projectsGrouped.map((p) => p.segmento))).filter(Boolean)
  const uniqueCategories = Array.from(new Set(projectsGrouped.map((p) => p.categoria))).filter(Boolean)

  const filteredProjects = projectsGrouped.filter((p) => {
    const textMatch = p.nombre_proyecto.toLowerCase().includes(search.toLowerCase())
    const areaMatch = area ? p.segmento === area : true
    const catMatch = category ? p.categoria === category : true
    const statusMatch = status ? (status === 'ready' ? p.status : !p.status) : true
    return textMatch && areaMatch && catMatch && statusMatch
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: ProjectRow[] = []
      capexRows
        .filter((row) => FUTURE_MONTHS.includes(row.mes))
        .forEach((row) => {
          const key = `${row.nombre_proyecto}-${row.mes}`
          if (drafts[key] !== undefined) {
            updates.push({ ...row, monto_usd: Number(drafts[key]), is_forecast: true })
          }
        })
      if (updates.length === 0) return
      await upsertForecastRows(updates)
    },
  })

  const handleChange = (project: string, month: number, value: string) => {
    const key = `${project}-${month}`
    setDrafts((prev) => ({ ...prev, [key]: Number(value) }))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Mis proyectos</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Buscar proyecto" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Select value={area} onChange={(e) => setArea(e.target.value)} label="Área">
              <option value="">Todas</option>
              {uniqueAreas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Categoría">
              <option value="">Todas</option>
              {uniqueCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Estado">
              <option value="">Todos</option>
              <option value="ready">READY</option>
              <option value="pending">PENDING</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando proyectos…
            </div>
          ) : null}
          {hasError ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <div>Error al leer Supabase. Mostrando datos locales.</div>
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Real YTD</TableHead>
                <TableHead>BDGT YTD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((p) => {
                const realYtd = p.rows
                  .filter((r) => !r.is_forecast && r.mes <= 8)
                  .reduce((sum, r) => sum + r.monto_usd, 0)
                const bdgtYtd = p.rows.filter((r) => r.mes <= 8).reduce((sum, r) => sum + r.bdgt_mes_usd, 0)
                return (
                  <TableRow key={p.nombre_proyecto}>
                    <TableCell className="font-semibold">{p.nombre_proyecto}</TableCell>
                    <TableCell>{p.segmento}</TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell>{p.responsable}</TableCell>
                    <TableCell>
                      <Badge variant={p.status ? 'success' : 'warning'}>
                        {p.status ? 'READY' : 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatMUSD(realYtd)}</TableCell>
                    <TableCell>{formatMUSD(bdgtYtd)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle>Forecast mensual</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ene-Ago son valores reales. Sep-Dic editable para forecast (solo filas permitidas por RLS).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos…
            </div>
          ) : null}
          {hasError ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <div>Datos locales mientras se recupera la conexión.</div>
            </div>
          ) : null}
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  {[...Array(12)].map((_, index) => (
                    <TableHead key={index}>{new Date(2025, index).toLocaleString('es', { month: 'short' })}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((p) => (
                  <TableRow key={p.nombre_proyecto}>
                    <TableCell className="font-semibold">{p.nombre_proyecto}</TableCell>
                    {[...Array(12)].map((_, index) => {
                      const month = index + 1
                      const row = p.rows.find((r) => r.mes === month)
                      const value = row?.monto_usd ?? 0
                      const key = `${p.nombre_proyecto}-${month}`
                      const draftValue = drafts[key]
                      const showInput = FUTURE_MONTHS.includes(month)
                      return (
                        <TableCell key={month} className="min-w-[110px]">
                          {showInput ? (
                            <Input
                              type="number"
                              className="h-9"
                              value={draftValue ?? value}
                              onChange={(e) => handleChange(p.nombre_proyecto, month, e.target.value)}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">{formatMUSD(value)}</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex items-center gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar forecast
          </Button>
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Forecast READY requiere meses futuros completos y actualizados en los últimos 7 días.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
