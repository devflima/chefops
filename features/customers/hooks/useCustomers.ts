'use client'

import { useQuery } from '@tanstack/react-query'

export type CustomerAddress = {
  id: string
  label?: string | null
  street?: string | null
  number?: string | null
  city?: string | null
  state?: string | null
}

export type Customer = {
  id: string
  name: string
  phone: string
  cpf: string | null
  created_at: string
  addresses: CustomerAddress[]
}

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return (json.data ?? []) as Customer[]
    },
  })
}
