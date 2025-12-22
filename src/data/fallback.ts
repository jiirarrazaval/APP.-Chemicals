import type { ProjectAggregate, ProjectRow } from '../types'

// Minimal fallback when Supabase is not reachable.
export const fallbackRows: ProjectRow[] = []

export const fallbackAggregates: ProjectAggregate[] = []
