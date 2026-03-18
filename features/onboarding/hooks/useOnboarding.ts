'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type OnboardingSteps = {
  id: string
  tenant_id: string
  has_category: boolean
  has_product: boolean
  has_menu_item: boolean
  has_table: boolean
  completed_at: string | null
}

export function useOnboarding() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as OnboardingSteps
    },
  })
}

export function useCompleteStep() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<Omit<OnboardingSteps, 'id' | 'tenant_id' | 'completed_at'>>) => {
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as OnboardingSteps
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['onboarding'], data)
    },
  })
}