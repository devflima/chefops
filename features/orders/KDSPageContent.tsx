import { useEffect, useState } from 'react'

import type { Order } from '@/features/orders/types'

import { getElapsedTimeState, kdsStatusConfig } from '@/features/orders/kds-page'

function ElapsedTime({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    function update() {
      const nextState = getElapsedTimeState(since)
      setElapsed(nextState.elapsed)
      setUrgent(nextState.urgent)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [since])

  return <span className={urgent ? 'animate-pulse font-bold text-red-500' : ''}>{elapsed}</span>
}

type Props = {
  orders: Order[]
  updatePending: boolean
  onAdvance: (order: Order) => void | Promise<void>
}

export function KDSPageContent({ orders, updatePending, onAdvance }: Props) {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cozinha</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Apenas itens de preparo — bebidas não aparecem aqui
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-sm text-slate-400">Ao vivo</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-lg text-slate-500">Nenhum pedido no momento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => {
            const config = kdsStatusConfig[order.status]
            if (!config) return null

            return (
              <div
                key={order.id}
                className={`rounded-xl border-2 ${config.bg} ${config.border} p-4`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl font-bold text-slate-900">#{order.order_number}</span>
                  <span className="font-mono text-sm text-slate-500">
                    <ElapsedTime since={order.created_at} />
                  </span>
                </div>

                {order.table_number && <p className="mb-2 text-xs text-slate-500">Mesa {order.table_number}</p>}

                <div className="mb-4 space-y-1.5">
                  {order.items?.map((item) => (
                    <div key={item.id}>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.quantity}× {item.name}
                      </p>
                      {item.notes && <p className="ml-4 text-xs text-orange-600">⚠ {item.notes}</p>}
                      {item.extras?.map((extra) => (
                        <p key={extra.id} className="ml-4 text-xs text-slate-500">
                          + {extra.name}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
                    <p className="text-xs text-yellow-800">📝 {order.notes}</p>
                  </div>
                )}

                <span className="mb-3 inline-block rounded-md bg-white/60 px-2 py-1 text-xs font-medium text-slate-600">
                  {config.label}
                </span>

                {config.next && (
                  <button
                    onClick={() => onAdvance(order)}
                    disabled={updatePending}
                    className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                  >
                    {config.nextLabel}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
