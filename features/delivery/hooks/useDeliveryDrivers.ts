'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type DeliveryDriver = {
  id: string
  tenant_id: string
  name: string
  phone: string | null
  vehicle_type: 'moto' | 'bike' | 'carro' | 'outro'
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

type DriverPayload = {
  name: string
  phone?: string
  vehicle_type: DeliveryDriver['vehicle_type']
  active?: boolean
  notes?: string
}

export function useDeliveryDrivers() {
  return useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-drivers')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as DeliveryDriver[]
    },
  })
}

export function useCreateDeliveryDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: DriverPayload) => {
      const res = await fetch('/api/delivery-drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as DeliveryDriver
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] })
    },
  })
}

export function useUpdateDeliveryDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: DriverPayload & { id: string }) => {
      const res = await fetch(`/api/delivery-drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as DeliveryDriver
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useDeleteDeliveryDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/delivery-drivers/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as { id: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
