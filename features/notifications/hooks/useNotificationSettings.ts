'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type NotificationSettings = {
  tenant_id: string
  whatsapp_order_received: boolean
  whatsapp_order_confirmed: boolean
  whatsapp_order_preparing: boolean
  whatsapp_order_ready: boolean
  whatsapp_order_delivered: boolean
  whatsapp_order_cancelled: boolean
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await fetch('/api/notification-settings')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as NotificationSettings
    },
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Omit<NotificationSettings, 'tenant_id'>) => {
      const res = await fetch('/api/notification-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as NotificationSettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
    },
  })
}
