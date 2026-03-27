'use client'

import { useState } from 'react'
import {
  useOrders,
  useUpdateOrderStatus,
} from '@/features/orders/hooks/useOrders'
import { useDeliveryDrivers } from '@/features/delivery/hooks/useDeliveryDrivers'
import { useHasFeature } from '@/features/plans/hooks/usePlan'
import { useQueryClient } from '@tanstack/react-query'
import type { Order } from '@/features/orders/types'
import {
  buildAdvanceDeliveryPayload,
  buildAdvanceOrderPayload,
  buildCancelOrderPayload,
  buildConfirmPaymentRequest,
  buildDriverAssignmentPayload,
  getOrderFilterChangeState,
  getOrdersInvalidationQueryKey,
  getOrderFilters,
} from '@/features/orders/orders-page'
import { OrdersPageContent } from '@/features/orders/OrdersPageContent'

export default function PedidosPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [manualOrderOpen, setManualOrderOpen] = useState(false)
  const { data, isLoading } = useOrders({ status: statusFilter, page, pageSize })
  const { data: deliveryDrivers } = useDeliveryDrivers()
  const hasWhatsappNotifications = useHasFeature('whatsapp_notifications')
  const updateStatus = useUpdateOrderStatus()

  async function handleAdvance(order: Order) {
    const payload = buildAdvanceOrderPayload(order)
    if (!payload) return
    await updateStatus.mutateAsync(payload)
  }

  async function handleCancel(order: Order) {
    const reason = prompt('Motivo do cancelamento:')
    if (reason === null) return
    await updateStatus.mutateAsync(buildCancelOrderPayload(order, reason))
  }

  async function handleAssignDriver(order: Order, deliveryDriverId: string) {
    await updateStatus.mutateAsync(buildDriverAssignmentPayload(order, deliveryDriverId))
  }

  async function handleAdvanceDelivery(order: Order) {
    const payload = buildAdvanceDeliveryPayload(order)
    if (!payload) return
    await updateStatus.mutateAsync(payload)
  }

  const filters = getOrderFilters()

  return (
    <OrdersPageContent
      manualOrderOpen={manualOrderOpen}
      onManualOrderOpenChange={setManualOrderOpen}
      filters={filters}
      statusFilter={statusFilter}
      onStatusFilterChange={(value) => {
        const nextState = getOrderFilterChangeState(value)
        setStatusFilter(nextState.statusFilter)
        setPage(nextState.page)
      }}
      isLoading={isLoading}
      orders={(data?.data ?? []) as Order[]}
      totalCount={data?.count}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      deliveryDrivers={deliveryDrivers ?? []}
      hasWhatsappNotifications={hasWhatsappNotifications}
      updatePending={updateStatus.isPending}
      onAssignDriver={handleAssignDriver}
      onAdvance={handleAdvance}
      onAdvanceDelivery={handleAdvanceDelivery}
      onConfirmPayment={async (targetOrder) => {
        const request = buildConfirmPaymentRequest(targetOrder)
        await fetch(request.url, request.init)
        queryClient.invalidateQueries({ queryKey: getOrdersInvalidationQueryKey() })
      }}
      onCancel={handleCancel}
    />
  )
}
