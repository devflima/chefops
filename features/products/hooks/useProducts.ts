'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateProductPayload, UpdateProductPayload } from '../types'

export function useProducts(params?: {
  category_id?: string
  active?: boolean
  page?: number
  pageSize?: number
}) {
  const query = new URLSearchParams()
  if (params?.category_id) query.set('category_id', params.category_id)
  if (params?.active !== undefined) query.set('active', String(params.active))
  if (params?.page) query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))

  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await fetch(`/api/products?${query}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateProductPayload & { id: string }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
  })
}
