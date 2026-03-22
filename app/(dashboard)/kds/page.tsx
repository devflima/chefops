'use client'

import { useEffect } from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { useKDSOrders } from '@/features/orders/hooks/useOrders'
import { useUpdateOrderStatus } from '@/features/orders/hooks/useOrders'
import { KDSPageContent } from '@/features/orders/KDSPageContent'
import { getKdsAdvancePayload } from '@/features/orders/kds-page'
import type { Order } from '@/features/orders/types'
import { createClient } from '@/lib/supabase/client'
import FeatureGate from '@/features/plans/components/FeatureGate'

export default function KDSPage() {
  const { data, refetch } = useKDSOrders()
  const updateStatus = useUpdateOrderStatus()
  const queryClient = useQueryClient()

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('kds-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          refetch()
          queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch, queryClient])

  async function handleAdvance(order: Order) {
    const payload = getKdsAdvancePayload(order)
    if (!payload) return
    await updateStatus.mutateAsync(payload)
    queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
  }

  const orders: Order[] = data ?? []

  return (
    <FeatureGate feature='kds'>
      <KDSPageContent
        orders={orders}
        updatePending={updateStatus.isPending}
        onAdvance={handleAdvance}
      />
    </FeatureGate>
  )
}
