import type { Order } from '@/features/orders/types'

import ManualOrderDialog from '@/features/orders/components/ManualOrderDialog'
import { OrdersDashboardHeader } from '@/features/orders/OrdersDashboardHeader'
import { OrdersFilters } from '@/features/orders/OrdersFilters'
import { OrdersListSection } from '@/features/orders/OrdersListSection'

type Props = {
  manualOrderOpen: boolean
  onManualOrderOpenChange: (open: boolean) => void
  filters: Array<{ label: string; value: string }>
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  isLoading: boolean
  orders: Order[]
  totalCount?: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  deliveryDrivers: Array<{ id: string; name: string; vehicle_type: string; active: boolean }>
  hasWhatsappNotifications: boolean
  updatePending: boolean
  chargingOrderId: string | null
  onAssignDriver: (order: Order, deliveryDriverId: string) => void | Promise<void>
  onAdvance: (order: Order) => void | Promise<void>
  onAdvanceDelivery: (order: Order) => void | Promise<void>
  onMercadoPagoCheckout: (order: Order) => void | Promise<void>
  onConfirmPayment: (order: Order) => void | Promise<void>
  onCancel: (order: Order) => void | Promise<void>
}

export function OrdersPageContent({
  manualOrderOpen,
  onManualOrderOpenChange,
  filters,
  statusFilter,
  onStatusFilterChange,
  isLoading,
  orders,
  totalCount,
  page,
  pageSize,
  onPageChange,
  deliveryDrivers,
  hasWhatsappNotifications,
  updatePending,
  chargingOrderId,
  onAssignDriver,
  onAdvance,
  onAdvanceDelivery,
  onMercadoPagoCheckout,
  onConfirmPayment,
  onCancel,
}: Props) {
  return (
    <div>
      <OrdersDashboardHeader onCreate={() => onManualOrderOpenChange(true)} />

      <OrdersFilters
        filters={filters}
        statusFilter={statusFilter}
        onChange={onStatusFilterChange}
      />

      <OrdersListSection
        isLoading={isLoading}
        orders={orders}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        deliveryDrivers={deliveryDrivers}
        hasWhatsappNotifications={hasWhatsappNotifications}
        updatePending={updatePending}
        chargingOrderId={chargingOrderId}
        onAssignDriver={onAssignDriver}
        onAdvance={onAdvance}
        onAdvanceDelivery={onAdvanceDelivery}
        onMercadoPagoCheckout={onMercadoPagoCheckout}
        onConfirmPayment={onConfirmPayment}
        onCancel={onCancel}
      />

      <ManualOrderDialog
        open={manualOrderOpen}
        onOpenChange={onManualOrderOpenChange}
      />
    </div>
  )
}
