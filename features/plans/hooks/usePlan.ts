'use client'

import { useQuery } from '@tanstack/react-query'
import type { PlanFeature, TenantPlan } from '../types'

export function usePlan() {
  return useQuery({
    queryKey: ['tenant-plan'],
    queryFn: async () => {
      const res = await fetch('/api/plan')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as TenantPlan
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useHasFeature(feature: PlanFeature) {
  const { data } = usePlan()
  return data?.features?.includes(feature) ?? false
}

export function useCanAddMore(
  resource: 'users' | 'tables' | 'products',
  current: number
) {
  const { data } = usePlan()
  if (!data) return false
  const limit = data[`max_${resource}` as keyof TenantPlan] as number
  if (limit === -1) return true // ilimitado
  return current < limit
}