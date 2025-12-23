import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { upsertForecastRows } from '../data/client'
import type { ProjectRow } from '../types'

const REQUIRED_COLUMNS = [
  'ano',
  'mes',
  'nombre_proyecto',
  'responsable_3',
  'monto_usd',
  'bdgt_mes_usd',
  'segmento',
  'categoria',
]

export default function UploadPage() {
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const mutation = useMutation({
    mutationFn: () => upsertForecastRows(rows),
  })

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = String(event.target?.result ?? '')
      const [headerLine, ...dataLines] = content.trim().split(/\r?\n/)
      const headers = headerLine.split(',').map((h) => h.trim())
      const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col))
      if (missing.length) {
        setErrors([`Faltan columnas requeridas: ${missing.join(', ')}`])
        return
      }
      const parsed: ProjectRow[] = []
      const validationErrors: string[] = []
      dataLines.forEach((line, index) => {
        const cells = line.split(',').map((c) => c.trim())
        const row: any = {}
        headers.forEach((h, i) => {
          row[h] = cells[i]
        })
        const ano = Number(row.ano)
        const mes = Number(row.mes)
        if (!ano || !mes || !row.nombre_proyecto) {
          validationErrors.push(`Línea ${index + 2}: año/mes/proyecto inválidos`)
          return
        }
        parsed.push({
          id: crypto.randomUUID(),
          ano,
          mes,
          numero_oi: row.numero_oi ?? null,
          nombre_proyecto: row.nombre_proyecto,
          desc_ceco: row.desc_ceco ?? row.segmento,
          segmento: row.segmento,
          area: row.area ?? null,
          tipo_proyecto: row.tipo_proyecto ?? row.categoria,
          categoria: row.categoria,
          responsable_3: row.responsable_3,
          monto_usd: Number(row.monto_usd ?? 0),
          bdgt_mes_usd: Number(row.bdgt_mes_usd ?? 0),
          is_forecast: row.is_forecast === 'true' || row.is_forecast === true,
          updated_at: new Date().toISOString(),
        })
      })
      setErrors(validationErrors)
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Carga CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <FileUp className="h-6 w-6" />
            <span>Selecciona archivo CSV con columnas requeridas</span>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          {errors.length ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <div>
                {errors.map((err) => (
                  <p key={err}>{err}</p>
                ))}
              </div>
            </div>
          ) : null}
          {rows.length ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{rows.length} filas listas para cargar.</div>
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subir a Supabase'}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>BDGT Mes</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Forecast?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((row) => (
                    <TableRow key={`${row.nombre_proyecto}-${row.mes}`}>
                      <TableCell>{row.nombre_proyecto}</TableCell>
                      <TableCell>{row.ano}</TableCell>
                      <TableCell>{row.mes}</TableCell>
                      <TableCell>{row.monto_usd}</TableCell>
                      <TableCell>{row.bdgt_mes_usd}</TableCell>
                      <TableCell>{row.responsable_3}</TableCell>
                      <TableCell>{row.is_forecast ? 'Sí' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 10 ? (
                <p className="text-xs text-muted-foreground">Mostrando primeras 10 filas.</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
