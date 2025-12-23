import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { fetchAggregatedStatus, fetchCapexRows } from '../data/client'
import { fallbackAggregates, fallbackRows } from '../data/fallback'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { formatMUSD } from '../lib/utils'

const CURRENT_MONTH = 8

function useCapexData() {
  const capexQuery = useQuery({
    queryKey: ['capex'],
    queryFn: fetchCapexRows,
    retry: false,
  })
  const aggregatesQuery = useQuery({
    queryKey: ['aggregates'],
    queryFn: fetchAggregatedStatus,
    retry: false,
  })

  return {
    capexRows: capexQuery.data ?? fallbackRows,
    aggregates: aggregatesQuery.data ?? fallbackAggregates,
    isLoading: capexQuery.isLoading || aggregatesQuery.isLoading,
    error: capexQuery.error || aggregatesQuery.error,
  }
}

function computeKpis(rows: ReturnType<typeof useCapexData>['capexRows']) {
  const realYtd = rows
    .filter((row) => !row.is_forecast && row.mes <= CURRENT_MONTH)
    .reduce((sum, row) => sum + row.monto_usd, 0)
  const bdgtYtd = rows
    .filter((row) => row.bdgt_mes_usd && row.mes <= CURRENT_MONTH)
    .reduce((sum, row) => sum + row.bdgt_mes_usd, 0)
  const variance = realYtd - bdgtYtd
  const pct = bdgtYtd ? (realYtd / bdgtYtd) * 100 : 0
  return { realYtd, bdgtYtd, variance, pct }
}

function buildMonthlySeries(rows: ReturnType<typeof useCapexData>['capexRows']) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return months.map((label, index) => {
    const month = index + 1
    const real = rows
      .filter((r) => !r.is_forecast && r.mes === month)
      .reduce((sum, r) => sum + r.monto_usd, 0)
    const forecast = rows
      .filter((r) => r.is_forecast && r.mes === month)
      .reduce((sum, r) => sum + r.monto_usd, 0)
    const bdgt = rows.filter((r) => r.mes === month).reduce((sum, r) => sum + r.bdgt_mes_usd, 0)
    return { label, real, forecast, bdgt }
  })
}

function groupByField(
  rows: ReturnType<typeof useCapexData>['capexRows'],
  field: 'segmento' | 'categoria'
) {
  const map: Record<string, { real: number; bdgt: number }> = {}
  rows.forEach((row) => {
    const key = row[field]
    if (!map[key]) {
      map[key] = { real: 0, bdgt: 0 }
    }
    if (!row.is_forecast && row.mes <= CURRENT_MONTH) map[key].real += row.monto_usd
    map[key].bdgt += row.bdgt_mes_usd
  })
  return Object.entries(map).map(([name, values]) => ({ name, ...values }))
}

function topSpends(rows: ReturnType<typeof useCapexData>['capexRows']) {
  return rows
    .filter((row) => !row.is_forecast && row.mes === CURRENT_MONTH)
    .sort((a, b) => b.monto_usd - a.monto_usd)
    .slice(0, 5)
}

export default function DashboardPage() {
  const { capexRows, aggregates, isLoading, error } = useCapexData()
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  const kpis = useMemo(() => computeKpis(capexRows), [capexRows])
  const monthlySeries = useMemo(() => buildMonthlySeries(capexRows), [capexRows])
  const areaSeries = useMemo(() => groupByField(capexRows, 'segmento'), [capexRows])
  const categorySeries = useMemo(() => groupByField(capexRows, 'categoria'), [capexRows])
  const filteredAggregates = useMemo(() => {
    return aggregates.filter((project) => {
      const areaOk = areaFilter ? project.segmento === areaFilter : true
      const categoryOk = categoryFilter ? project.categoria === categoryFilter : true
      return areaOk && categoryOk
    })
  }, [aggregates, areaFilter, categoryFilter])

  const uniqueAreas = Array.from(new Set(capexRows.map((r) => r.segmento))).filter(Boolean)
  const uniqueCategories = Array.from(new Set(capexRows.map((r) => r.categoria))).filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Real YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMUSD(kpis.realYtd)}</div>
            <p className="text-sm text-muted-foreground">Enero - Agosto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>BDGT YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMUSD(kpis.bdgtYtd)}</div>
            <p className="text-sm text-muted-foreground">Planificado a agosto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Variación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMUSD(kpis.variance)}</div>
            <p className="text-sm text-muted-foreground">Real - BDGT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>% Ejecución</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{kpis.pct.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Sobre BDGT YTD</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Real acumulado vs BDGT</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatMUSD(value)} />
                <Legend />
                <Bar dataKey="bdgt" name="BDGT" barSize={14} fill="#e5e7eb" />
                <Line dataKey="real" name="Real" stroke="#2563eb" strokeWidth={3} dot={false} />
                <Line
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top desembolsos Agosto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSpends(capexRows).map((row) => (
              <div key={row.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{row.nombre_proyecto}</p>
                  <p className="text-xs text-muted-foreground">{row.segmento}</p>
                </div>
                <span className="text-sm font-semibold">{formatMUSD(row.monto_usd)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Real vs BDGT por Área</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaSeries} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatMUSD(value)} />
                <Legend />
                <Bar dataKey="real" fill="#2563eb" name="Real" />
                <Bar dataKey="bdgt" fill="#c4b5fd" name="BDGT" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Real vs BDGT por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySeries} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatMUSD(value)} />
                <Legend />
                <Bar dataKey="real" fill="#16a34a" name="Real" />
                <Bar dataKey="bdgt" fill="#fdba74" name="BDGT" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Proyectos filtrados</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} label="Área">
              <option value="">Todas</option>
              {uniqueAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Categoría"
            >
              <option value="">Todas</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos…
            </div>
          ) : null}
          {error ? (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertTriangle className="h-4 w-4" />
              Error al leer Supabase. Mostrando datos locales.
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Real YTD</TableHead>
                <TableHead>BDGT YTD</TableHead>
                <TableHead>% Ejec.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Last update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAggregates.map((project) => {
                const exec = project.bdgt_ytd ? (project.real_ytd / project.bdgt_ytd) * 100 : 0
                return (
                  <TableRow key={project.project_key}>
                    <TableCell className="font-semibold">{project.nombre_proyecto}</TableCell>
                    <TableCell>{project.segmento}</TableCell>
                    <TableCell>{project.categoria}</TableCell>
                    <TableCell>{project.responsable}</TableCell>
                    <TableCell>{formatMUSD(project.real_ytd)}</TableCell>
                    <TableCell>{formatMUSD(project.bdgt_ytd)}</TableCell>
                    <TableCell>{exec.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant={project.forecast_ready ? 'success' : 'warning'}>
                        {project.forecast_ready ? 'READY' : 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.forecast_last_updated_at
                        ? new Date(project.forecast_last_updated_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
