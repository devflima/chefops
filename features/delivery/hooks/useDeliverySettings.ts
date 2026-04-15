'use client'

import { normalizeDeliverySettings } from '@/lib/delivery-settings'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type DeliverySettings = {
  tenant_id: string
  delivery_enabled: boolean
  flat_fee: number
  accepting_orders: boolean
  schedule_enabled: boolean
  opens_at: string | null
  closes_at: string | null
  pricing_mode?: 'flat' | 'distance'
  max_radius_km?: number | null
  fee_per_km?: number | null
  origin_zip_code?: string | null
  origin_street?: string | null
  origin_number?: string | null
  origin_neighborhood?: string | null
  origin_city?: string | null
  origin_state?: string | null
}

export function useDeliverySettings() {
  return useQuery({
    queryKey: ['delivery-settings'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-settings')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return normalizeDeliverySettings(json.data) as DeliverySettings
    },
  })
}

export function useUpdateDeliverySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Omit<DeliverySettings, 'tenant_id'>) => {
      const res = await fetch('/api/delivery-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return normalizeDeliverySettings(json.data) as DeliverySettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-settings'] })
    },
  })
}
