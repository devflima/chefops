'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateTabPayload } from '../types'

export function useTabs(status: 'open' | 'closed' = 'open') {
  return useQuery({
    queryKey: ['tabs', status],
    queryFn: async () => {
      const res = await fetch(`/api/tabs?status=${status}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })
}

export function useCreateTab() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateTabPayload) => {
      const res = await fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
    },
  })
}

export function useCloseTab() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tabs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
