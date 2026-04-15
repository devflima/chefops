'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type NotificationSettings = {
  tenant_id: string
  whatsapp_order_received: boolean
  whatsapp_order_confirmed: boolean
  whatsapp_order_preparing: boolean
  whatsapp_order_ready: boolean
  whatsapp_order_out_for_delivery: boolean
  whatsapp_order_delivered: boolean
  whatsapp_order_cancelled: boolean
}

const defaultNotificationSettings = {
  whatsapp_order_received: true,
  whatsapp_order_confirmed: true,
  whatsapp_order_preparing: true,
  whatsapp_order_ready: true,
  whatsapp_order_out_for_delivery: true,
  whatsapp_order_delivered: false,
  whatsapp_order_cancelled: true,
}

function normalizeNotificationSettings(data: Partial<NotificationSettings> | null | undefined) {
  if (!data) return null

  return {
    tenant_id: data.tenant_id ?? '',
    ...defaultNotificationSettings,
    ...data,
  }
}

export function useNotificationSettings(enabled = true) {
  return useQuery({
    queryKey: ['notification-settings'],
    enabled,
    queryFn: async () => {
      const res = await fetch('/api/notification-settings')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return normalizeNotificationSettings(json.data) as NotificationSettings
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
      return normalizeNotificationSettings(json.data) as NotificationSettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
    },
  })
}
