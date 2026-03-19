'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useMercadoPagoAccount() {
  return useQuery({
    queryKey: ['mercado-pago-account'],
    queryFn: async () => {
      const res = await fetch('/api/mercado-pago/account')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
  })
}

export function useDisconnectMercadoPagoAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/mercado-pago/account', {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mercado-pago-account'] })
    },
  })
}
