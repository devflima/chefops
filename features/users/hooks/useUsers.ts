'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EstablishmentRole, RoleCounts, RoleLimits } from '@/lib/rbac'
import type { Plan } from '@/features/plans/types'

export type TeamUser = {
  id: string
  full_name: string | null
  email: string
  role: EstablishmentRole
  created_at: string
}

type UsersResponse = {
  users: TeamUser[]
  current_user_id: string
  plan: Plan
  limits: {
    max_users: number
    role_limits: RoleLimits
    available_roles: EstablishmentRole[]
  }
  counts: RoleCounts
}

export function useUsers() {
  return useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as UsersResponse
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      full_name: string
      email: string
      password: string
      role: EstablishmentRole
    }) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-plan'] })
    },
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: EstablishmentRole }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-plan'] })
    },
  })
}
