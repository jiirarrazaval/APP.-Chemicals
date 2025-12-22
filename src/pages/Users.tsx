import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAggregatedStatus } from '../data/client'
import { fallbackAggregates } from '../data/fallback'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { formatMUSD } from '../lib/utils'

export default function UsersPage() {
  const aggregateQuery = useQuery({ queryKey: ['aggregates'], queryFn: fetchAggregatedStatus, retry: false })
  const aggregates = aggregateQuery.data ?? fallbackAggregates

  const grouped = useMemo(() => {
    const segments: Record<
      string,
      { responsables: Record<string, { projects: typeof aggregates; readyCount: number; total: number }>; readyCount: number; total: number }
    > = {}
    aggregates.forEach((agg) => {
      if (!segments[agg.segmento]) {
        segments[agg.segmento] = { responsables: {}, readyCount: 0, total: 0 }
      }
      const segment = segments[agg.segmento]
      if (!segment.responsables[agg.responsable]) {
        segment.responsables[agg.responsable] = { projects: [], readyCount: 0, total: 0 }
      }
      const responsible = segment.responsables[agg.responsable]
      responsible.projects.push(agg)
      responsible.total += 1
      segment.total += 1
      if (agg.forecast_ready) {
        responsible.readyCount += 1
        segment.readyCount += 1
      }
    })
    return segments
  }, [aggregates])

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([segment, data]) => (
        <Card key={segment}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{segment}</span>
              <Badge variant={data.readyCount === data.total ? 'success' : 'warning'}>
                {data.readyCount}/{data.total} READY
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.responsables).map(([responsable, info]) => (
              <div key={responsable} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold">{responsable}</div>
                  <Badge variant={info.readyCount === info.total ? 'success' : 'warning'}>
                    {info.readyCount === info.total ? 'LISTO' : 'PENDIENTE'} ({info.readyCount}/{info.total})
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Real YTD</TableHead>
                      <TableHead>BDGT YTD</TableHead>
                      <TableHead>Forecast Sep-Dic</TableHead>
                      <TableHead>Última act.</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {info.projects.map((project) => (
                      <TableRow key={project.project_key}>
                        <TableCell className="font-medium">{project.nombre_proyecto}</TableCell>
                        <TableCell>{formatMUSD(project.real_ytd)}</TableCell>
                        <TableCell>{formatMUSD(project.bdgt_ytd)}</TableCell>
                        <TableCell>
                          {formatMUSD(project.forecast_sep + project.forecast_oct + project.forecast_nov + project.forecast_dec)}
                        </TableCell>
                        <TableCell>
                          {project.forecast_last_updated_at
                            ? new Date(project.forecast_last_updated_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={project.forecast_ready ? 'success' : 'warning'}>
                            {project.forecast_ready ? 'READY' : 'PENDING'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
