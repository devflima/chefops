import { Building2, CreditCard, TrendingUp } from 'lucide-react'

import type { buildAdminTenantCards } from '@/features/admin/admin-tenants-page'

type Props = {
  cards: ReturnType<typeof buildAdminTenantCards>
}

export function AdminTenantsStats({ cards }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">{card.title}</p>
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
              card.tone === 'sky' ? 'bg-sky-50 text-sky-700'
                : card.tone === 'red' ? 'bg-red-50 text-red-700'
                  : card.tone === 'amber' ? 'bg-amber-50 text-amber-700'
                    : 'bg-violet-50 text-violet-700'
            }`}>
              {card.tone === 'sky' ? <Building2 className="h-4 w-4" />
                : card.tone === 'amber' ? <TrendingUp className="h-4 w-4" />
                  : <CreditCard className="h-4 w-4" />}
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{card.value}</p>
          <p className="mt-2 text-xs text-slate-400">{card.description}</p>
        </div>
      ))}
    </div>
  )
}
