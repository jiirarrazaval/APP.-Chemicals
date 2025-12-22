import { createContext, useContext, useEffect } from 'react'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { AppRole, Profile } from '../types'
import { getSessionWithProfile } from '../data/client'

export type AuthContextType = {
  loading: boolean
  sessionUserId: string | null
  profile: Profile | null
  role: AppRole | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: getSessionWithProfile,
  })

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['capex'] })
      queryClient.invalidateQueries({ queryKey: ['aggregates'] })
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [queryClient, refetch])

  return (
    <AuthContext.Provider
      value={{
        loading: isLoading,
        sessionUserId: data?.session?.user.id ?? null,
        profile: data?.profile ?? null,
        role: data?.role ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  })
}
