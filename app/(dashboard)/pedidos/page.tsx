'use client'

import { useState } from 'react'
import {
  useOrders,
  useUpdateOrderStatus,
} from '@/features/orders/hooks/useOrders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'
import type { Order, OrderStatus } from '@/features/orders/types'

const statusConfig: Record<
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

const paymentLabels = {
  online: 'Online',
  table: 'Na mesa',
  counter: 'No caixa',
}

export default function PedidosPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useOrders({ status: statusFilter })
  const updateStatus = useUpdateOrderStatus()

  async function handleAdvance(order: Order) {
    const config = statusConfig[order.status]
    if (!config.next) return
    await updateStatus.mutateAsync({ id: order.id, status: config.next })
  }

  async function handleCancel(order: Order) {
    const reason = prompt('Motivo do cancelamento:')
    if (reason === null) return
    await updateStatus.mutateAsync({
      id: order.id,
      status: 'cancelled',
      cancelled_reason: reason,
    })
  }

  const filters: { label: string; value: string }[] = [
    { label: 'Todos', value: '' },
    { label: 'Aguardando', value: 'pending' },
    { label: 'Preparando', value: 'preparing' },
    { label: 'Pronto', value: 'ready' },
    { label: 'Entregue', value: 'delivered' },
    { label: 'Cancelado', value: 'cancelled' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pedidos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Atualiza automaticamente a cada 15 segundos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Carregando...</div>
      ) : data?.data?.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data?.map((order: Order) => {
            const config = statusConfig[order.status]
            return (
              <div
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-900">
                        #{order.order_number}
                      </span>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${config.color}`}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {paymentLabels[order.payment_method]}
                      </span>
                    </div>
                    {order.customer_name && (
                      <p className="mb-1 text-sm text-slate-600">
                        Cliente:{' '}
                        <span className="font-medium">
                          {order.customer_name}
                        </span>
                        {order.table_number && ` — Mesa ${order.table_number}`}
                      </p>
                    )}
                    {/* Itens */}
                    <div className="mt-2 space-y-0.5">
                      {order.items?.map((item) => (
                        <p key={item.id} className="text-sm text-slate-500">
                          {item.quantity}× {item.name}
                          {item.notes && (
                            <span className="text-slate-400">
                              {' '}
                              ({item.notes})
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                    {order.notes && (
                      <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-400">
                        Obs: {order.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-semibold text-slate-900">
                      R$ {Number(order.total).toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      {config.next && (
                        <Button
                          size="sm"
                          onClick={() => handleAdvance(order)}
                          disabled={updateStatus.isPending}
                        >
                          {config.nextLabel}
                        </Button>
                      )}
                      {order.status === 'delivered' &&
                        order.payment_status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              await updateStatus.mutateAsync({
                                id: order.id,
                                status: order.status,
                                cancelled_reason: undefined,
                              })
                              await fetch(`/api/orders/${order.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  payment_status: 'paid',
                                }),
                              })
                            }}
                          >
                            Confirmar pagamento
                          </Button>
                        )}
                      {!['delivered', 'cancelled'].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(order)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
