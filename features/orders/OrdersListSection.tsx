import PaginationControls from '@/components/shared/PaginationControls'
import { OrdersEmptyState } from '@/features/orders/OrdersEmptyState'
import { OrderCard } from '@/features/orders/OrderCard'
import { getOrdersTotalPages, orderStatusConfig } from '@/features/orders/orders-page'
import type { Order } from '@/features/orders/types'

export function OrdersListSection({
  isLoading,
  orders,
  totalCount,
  page,
  pageSize,
  onPageChange,
  deliveryDrivers,
  hasWhatsappNotifications,
  updatePending,
  onAssignDriver,
  onAdvance,
  onAdvanceDelivery,
  onConfirmPayment,
  onCancel,
}: {
  isLoading: boolean
  orders: Order[]
  totalCount?: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  deliveryDrivers: Array<{ id: string; name: string; vehicle_type: string; active: boolean }>
  hasWhatsappNotifications: boolean
  updatePending: boolean
  chargingOrderId?: string | null
  onAssignDriver: (order: Order, deliveryDriverId: string) => void | Promise<void>
  onAdvance: (order: Order) => void | Promise<void>
  onAdvanceDelivery: (order: Order) => void | Promise<void>
  onMercadoPagoCheckout?: (order: Order) => void | Promise<void>
  onConfirmPayment: (order: Order) => void | Promise<void>
  onCancel: (order: Order) => void | Promise<void>
}) {
  return (
    <>
      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Carregando...</div>
      ) : orders.length === 0 ? (
        <OrdersEmptyState />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              config={orderStatusConfig[order.status]}
              deliveryDrivers={deliveryDrivers}
              hasWhatsappNotifications={hasWhatsappNotifications}
              updatePending={updatePending}
              onAssignDriver={onAssignDriver}
              onAdvance={onAdvance}
              onAdvanceDelivery={onAdvanceDelivery}
              onConfirmPayment={onConfirmPayment}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <PaginationControls
          page={page}
          totalPages={getOrdersTotalPages(totalCount, pageSize)}
          onPageChange={onPageChange}
        />
      </div>
    </>
  )
}
