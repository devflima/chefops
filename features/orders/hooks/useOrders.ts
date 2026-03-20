'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateOrderPayload, DeliveryStatus, OrderStatus } from '../types'

export function useOrders(params?: {
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}) {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))

  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const res = await fetch(`/api/orders?${query}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json
    },
    refetchInterval: 15000, // atualiza a cada 15s
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      delivery_driver_id,
      delivery_status,
      cancelled_reason,
    }: {
      id: string
      status: OrderStatus
      delivery_driver_id?: string | null
      delivery_status?: DeliveryStatus | null
      cancelled_reason?: string
    }) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancelled_reason, delivery_driver_id, delivery_status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

export function useMenuItems() {
  return useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const res = await fetch('/api/menu-items')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
  })
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string
      description?: string
      price: number
      category_id?: string
      available?: boolean
      display_order?: number
    }) => {
      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['menu-items'] }),
  })
}

export function useSalesMetrics(period: 'today' | 'month') {
  return useQuery({
    queryKey: ['sales-metrics', period],
    queryFn: async () => {
      const res = await fetch(`/api/sales/metrics?period=${period}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })
}

export function useKDSOrders() {
  return useQuery({
    queryKey: ['kds-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders/kds')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 10000,
  })
}
