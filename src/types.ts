export type AppRole = 'admin' | 'user'

export type Profile = {
  user_id: string
  full_name: string
  email: string
}

export type ProjectRow = {
  id: string
  ano: number
  mes: number
  numero_oi: string | null
  nombre_proyecto: string
  desc_ceco: string
  segmento: string
  area: string | null
  tipo_proyecto: string
  categoria: string
  responsable_3: string
  monto_usd: number
  bdgt_mes_usd: number
  is_forecast: boolean
  updated_at: string | null
}

export type ProjectAggregate = {
  project_key: string
  nombre_proyecto: string
  segmento: string
  categoria: string
  responsable: string
  real_ytd: number
  bdgt_ytd: number
  forecast_sep: number
  forecast_oct: number
  forecast_nov: number
  forecast_dec: number
  forecast_last_updated_at: string | null
  forecast_ready: boolean
}

export type ReadyStatus = 'READY' | 'PENDING'
