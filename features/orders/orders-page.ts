import type {
  DeliveryStatus,
  Order,
  OrderStatus,
} from '@/features/orders/types'

export type DeliveryAddress = {
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}

export const orderStatusConfig: Record<
  OrderStatus,
  { label: string; color: string; next?: OrderStatus; nextLabel?: string }
> = {
  pending: {
    label: 'Aguardando',
    color: 'bg-amber-100 text-amber-800',
    next: 'confirmed',
    nextLabel: 'Confirmar',
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-blue-100 text-blue-800',
    next: 'preparing',
    nextLabel: 'Iniciar preparo',
  },
  preparing: {
    label: 'Preparando',
    color: 'bg-purple-100 text-purple-800',
    next: 'ready',
    nextLabel: 'Marcar pronto',
  },
  ready: {
    label: 'Pronto',
    color: 'bg-green-100 text-green-800',
    next: 'delivered',
    nextLabel: 'Entregar',
  },
  delivered: { label: 'Entregue', color: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
}

export const paymentLabels = {
  online: 'Online',
  table: 'Na mesa',
  counter: 'No caixa',
  delivery: 'Na entrega',
}

export const whatsappEventLabels: Record<string, string> = {
  order_received: 'Pedido recebido',
  order_confirmed: 'Pedido confirmado',
  order_preparing: 'Em preparo',
  order_ready: 'Pedido pronto',
  order_out_for_delivery: 'Saiu para entrega',
  order_delivered: 'Pedido entregue',
  order_cancelled: 'Pedido cancelado',
}

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  waiting_dispatch: 'Aguardando despacho',
  assigned: 'Entregador atribuído',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entrega concluída',
}

export const whatsappStatusStyles: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  skipped: 'bg-slate-100 text-slate-600',
}

export function normalizeDeliveryAddress(value: unknown): DeliveryAddress | null {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as DeliveryAddress
    } catch {
      return null
    }
  }

  if (typeof value === 'object') {
    return value as DeliveryAddress
  }

  return null
}

export function getOrderFilters() {
  return [
    { label: 'Todos', value: '' },
    { label: 'Aguardando', value: 'pending' },
    { label: 'Preparando', value: 'preparing' },
    { label: 'Pronto', value: 'ready' },
    { label: 'Entregue', value: 'delivered' },
    { label: 'Cancelado', value: 'cancelled' },
  ]
}

export function getSortedNotifications(order: Pick<Order, 'notifications'>) {
  return [...(order.notifications ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function getLatestWhatsappNotification(order: Pick<Order, 'notifications'>) {
  return getSortedNotifications(order)[0] ?? null
}

export function shouldShowWhatsappCard(
  order: Pick<Order, 'payment_method' | 'table_number' | 'notifications'>,
  hasWhatsappNotifications: boolean
) {
  return (
    hasWhatsappNotifications &&
    ['online', 'delivery'].includes(order.payment_method) &&
    !order.table_number &&
    !!getLatestWhatsappNotification(order)
  )
}

export function shouldShowAdvanceButton(order: Pick<Order, 'status' | 'delivery_address'>) {
  const config = orderStatusConfig[order.status]
  return !!config.next && !(normalizeDeliveryAddress(order.delivery_address) && order.status === 'ready')
}

export function getDeliveryActionLabel(order: Pick<Order, 'status' | 'delivery_status'>) {
  if (order.status !== 'ready') return null
  return order.delivery_status === 'out_for_delivery'
    ? 'Confirmar entrega'
    : 'Saiu para entrega'
}

export function buildDriverAssignmentPayload(order: Pick<Order, 'id' | 'status'>, deliveryDriverId: string) {
  return {
    id: order.id,
    status: order.status,
    delivery_driver_id: deliveryDriverId || null,
  }
}

export function buildAdvanceOrderPayload(order: Pick<Order, 'id' | 'status'>) {
  const config = orderStatusConfig[order.status]
  if (!config.next) return null

  return { id: order.id, status: config.next }
}

export function buildAdvanceDeliveryPayload(
  order: Pick<Order, 'id' | 'status' | 'delivery_status'>
) {
  if (order.status !== 'ready') return null

  if (order.delivery_status === 'out_for_delivery') {
    return {
      id: order.id,
      status: 'delivered' as const,
      delivery_status: 'delivered' as const,
    }
  }

  return {
    id: order.id,
    status: order.status,
    delivery_status: 'out_for_delivery' as const,
  }
}

export function buildConfirmPaymentRequest(order: Pick<Order, 'id'>) {
  return {
    url: `/api/orders/${order.id}`,
    init: {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: 'paid' }),
    },
  }
}

export function buildCancelOrderPayload(order: Pick<Order, 'id'>, reason: string) {
  return {
    id: order.id,
    status: 'cancelled' as const,
    cancelled_reason: reason,
  }
}

export function getMercadoPagoCheckoutErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro ao gerar cobrança.'
}

export function getOrdersTotalPages(totalCount: number | undefined, pageSize: number) {
  return Math.max(1, Math.ceil((totalCount ?? 0) / pageSize))
}

export function getOrderFilterChangeState(value: string) {
  return {
    statusFilter: value,
    page: 1,
  }
}

export function getOrdersInvalidationQueryKey() {
  return ['orders']
}
