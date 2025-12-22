import { supabase } from '../lib/supabaseClient'
import type { AppRole, Profile, ProjectAggregate, ProjectRow } from '../types'

export async function getSessionWithProfile() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  if (!session) return { session: null, profile: null, role: null as AppRole | null }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (profileError) throw profileError

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  if (roleError) throw roleError

  return { session, profile: profile as Profile, role: roleRow.role as AppRole }
}

export async function fetchCapexRows() {
  const { data, error } = await supabase
    .from('capex_data')
    .select('*')
    .order('ano')
    .order('mes')
  if (error) throw error
  return data as ProjectRow[]
}

export async function fetchAggregatedStatus() {
  const { data, error } = await supabase
    .from('project_forecast_status')
    .select('*')
  if (error) throw error
  return data as ProjectAggregate[]
}

export async function upsertForecastRows(rows: ProjectRow[]) {
  const { error } = await supabase.from('capex_data').upsert(rows, {
    onConflict: 'ano,mes,nombre_proyecto,responsable_3',
  })
  if (error) throw error
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  await supabase.auth.signOut()
}
