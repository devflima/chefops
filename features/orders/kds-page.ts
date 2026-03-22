import type { Order, OrderStatus } from '@/features/orders/types'

export const kdsStatusConfig: Record<
  string,
  {
    label: string
    bg: string
    border: string
    next?: OrderStatus
    nextLabel?: string
  }
> = {
  confirmed: {
    label: 'Aguardando preparo',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    next: 'preparing',
    nextLabel: 'Iniciar preparo',
  },
  preparing: {
    label: 'Preparando',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    next: 'ready',
    nextLabel: 'Marcar pronto',
  },
}

export function getKdsAdvancePayload(order: Pick<Order, 'id' | 'status'>) {
  const config = kdsStatusConfig[order.status]

  if (!config?.next) {
    return null
  }

  return {
    id: order.id,
    status: config.next,
  }
}
