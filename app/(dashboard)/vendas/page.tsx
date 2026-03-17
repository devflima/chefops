'use client'

import { useState } from 'react'
import { useSalesMetrics } from '@/features/orders/hooks/useOrders'
import {
  BarChart2,
  TrendingUp,
  ShoppingBag,
  XCircle,
  Clock,
} from 'lucide-react'

export default function VendasPage() {
  const [period, setPeriod] = useState<'today' | 'month'>('today')
  const { data: metrics, isLoading } = useSalesMetrics(period)

  const cards = metrics
    ? [
        {
          label: 'Faturamento',
          value: `R$ ${Number(metrics.revenue).toFixed(2)}`,
          icon: TrendingUp,
          color: 'text-green-600',
          bg: 'bg-green-50',
        },
        {
          label: 'Pedidos entregues',
          value: metrics.delivered,
          icon: ShoppingBag,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
        },
        {
          label: 'Ticket médio',
          value: `R$ ${Number(metrics.average_ticket).toFixed(2)}`,
          icon: BarChart2,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
        },
        {
          label: 'Cancelamentos',
          value: metrics.cancelled,
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
        },
        {
          label: 'Em andamento',
          value: metrics.pending,
          icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        },
        {
          label: 'Taxa de cancelamento',
          value: `${metrics.cancellation_rate}%`,
          icon: XCircle,
          color: 'text-slate-600',
          bg: 'bg-slate-50',
        },
      ]
    : []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vendas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Atualiza a cada 30 segundos
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['today', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p === 'today' ? 'Hoje' : 'Este mês'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">
          Carregando métricas...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {cards.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">{label}</p>
                <div
                  className={`h-8 w-8 ${bg} flex items-center justify-center rounded-lg`}
                >
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
