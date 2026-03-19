'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateMovementPayload } from '../types'

export function useStockBalance(params?: {
  category_id?: string
  only_active?: boolean
}) {
  const query = new URLSearchParams()
  if (params?.category_id) query.set('category_id', params.category_id)
  if (params?.only_active !== undefined) query.set('only_active', String(params.only_active))

  return useQuery({
    queryKey: ['stock-balance', params],
    queryFn: async () => {
      const res = await fetch(`/api/stock/balance?${query}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
  })
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const res = await fetch('/api/stock/alerts')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
  })
}

export function useStockMovements(params?: { product_id?: string }) {
  const query = new URLSearchParams()
  if (params?.product_id) query.set('product_id', params.product_id)

  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: async () => {
      const res = await fetch(`/api/stock/movements?${query}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json
    },
  })
}

export function useCreateMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMovementPayload) => {
      const res = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
    },
  })
}

export function useCloseDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/stock/close-day', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] })
    },
  })
}
