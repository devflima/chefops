'use client'

import { useMemo, useState } from 'react'
import PaginationControls from '@/components/shared/PaginationControls'

type CheckoutSession = {
  id: string
  status: string
  amount: number
  mercado_pago_payment_id: string | null
  created_order_id: string | null
  created_at: string
}

type TenantEvent = {
  id: string
  message: string
  created_at: string
}

type CheckoutListProps = {
  checkoutSessions: CheckoutSession[]
}

type HistoryListProps = {
  events: TenantEvent[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

const CHECKOUTS_PER_PAGE = 5
const EVENTS_PER_PAGE = 6

export function TenantCheckoutList({ checkoutSessions }: CheckoutListProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(checkoutSessions.length / CHECKOUTS_PER_PAGE))

  const paginatedCheckouts = useMemo(() => {
    const start = (page - 1) * CHECKOUTS_PER_PAGE
    return checkoutSessions.slice(start, start + CHECKOUTS_PER_PAGE)
  }, [page, checkoutSessions])

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Últimas sessões de checkout</p>
      {checkoutSessions.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma sessão recente.</p>
      ) : (
        <div className="space-y-2">
          {paginatedCheckouts.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-700">{session.status}</p>
                <p className="text-xs text-slate-400">
                  {formatCurrency(Number(session.amount ?? 0))} · {formatDate(session.created_at)}
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>{session.created_order_id ? 'Pedido criado' : 'Sem pedido'}</p>
                <p>{session.mercado_pago_payment_id ? `Pagamento ${session.mercado_pago_payment_id}` : 'Sem pagamento'}</p>
              </div>
            </div>
          ))}

          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}

export function TenantHistoryList({ events }: HistoryListProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(events.length / EVENTS_PER_PAGE))

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * EVENTS_PER_PAGE
    return events.slice(start, start + EVENTS_PER_PAGE)
  }, [page, events])

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Histórico administrativo</h2>
          <p className="text-sm text-slate-500">Alterações de plano, cobrança e status.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
          Nenhum evento administrativo registrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedEvents.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-700">{event.message}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(event.created_at).toLocaleDateString('pt-BR')} às{' '}
                {new Date(event.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ))}

          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  )
}
