'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateTablePayload, OpenSessionPayload } from '../types'

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await fetch('/api/tables')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })
}

export function useUpdateTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; number?: string; capacity?: number }) => {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useDeleteTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useCreateTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTablePayload) => {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useOpenSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: OpenSessionPayload) => {
      const res = await fetch('/api/tables/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useCloseSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/tables/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await fetch(`/api/tables/sessions/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    enabled: !!id,
    refetchInterval: 10000,
  })
}
