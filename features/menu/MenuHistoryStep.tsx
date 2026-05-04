'use client'

import { Clock, Package, ChevronRight } from 'lucide-react'
import type { PublicOrderStatus } from '@/features/menu/public-menu'
import { getOrderSteps, getPublicOrderStatusCardTone } from '@/features/menu/public-menu'

type Props = {
  orders: PublicOrderStatus[]
  loading: boolean
  onSelectOrder: (orderId: string) => void
}

const statusTones = {
  warning: 'bg-orange-100 text-orange-700',
  progress: 'bg-blue-100 text-blue-700',
  delivery: 'bg-purple-100 text-purple-700',
  default: 'bg-slate-100 text-slate-700',
}

export function MenuHistoryStep({ orders, loading, onSelectOrder }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
      {loading ? (
        <div className="h-full flex flex-col items-center justify-center gap-3 py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Buscando seu histórico...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum pedido ainda</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Você ainda não realizou pedidos com este número de telefone. Que tal começar agora?
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">
            Últimos 10 pedidos
          </p>
          {orders.map((order) => {
            const tone = getPublicOrderStatusCardTone(order) as keyof typeof statusTones
            const steps = getOrderSteps(null, order.payment_method)
            const step = steps.find(s => s.key === order.status)

            return (
              <button
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className="w-full text-left p-4 rounded-2xl border border-white bg-white shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex items-center justify-between group active:scale-[0.98]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-extrabold text-slate-900 tracking-tight">#{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusTones[tone] || statusTones.default}`}>
                      {step?.label ?? (order.status === 'cancelled' ? 'Cancelado' : order.status)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      Total: R$ {Number(order.total ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
