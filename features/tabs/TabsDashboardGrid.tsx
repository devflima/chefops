import { Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tab } from '@/features/tabs/types'
import { getLiveTotal, tabStatusConfig } from '@/features/tabs/tabs-page'

export function TabsDashboardGrid({
  tabs,
  closeTabPending,
  onSelect,
  onClose,
}: {
  tabs: Tab[]
  closeTabPending: boolean
  onSelect: (tab: Tab) => void
  onClose: (tab: Tab) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {tabs.map((tab) => {
        const liveTotal = getLiveTotal(tab)
        const config = tabStatusConfig[tab.status]

        return (
          <div
            key={tab.id}
            className={`cursor-pointer rounded-xl border-2 ${config.bg} ${config.border} p-4 transition-shadow hover:shadow-md`}
            onClick={() => onSelect(tab)}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900">{tab.label}</span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                {config.label}
              </span>
            </div>

            <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
              <Clock3 className="h-3 w-3" />
              {new Date(tab.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>

            <div className="border-t border-slate-200/70 pt-3">
              <p className="text-sm font-semibold text-slate-900">R$ {liveTotal.toFixed(2)}</p>
              <p className="text-xs text-slate-400">
                {tab.orders?.length ?? 0} pedido{(tab.orders?.length ?? 0) !== 1 ? 's' : ''}
              </p>
              {tab.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{tab.notes}</p>}
            </div>

            <div className="mt-3 space-y-1.5">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(tab)
                }}
              >
                Ver detalhes
              </Button>

              {tab.status === 'open' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-red-200 text-xs text-red-600 hover:bg-red-50"
                  disabled={closeTabPending}
                  onClick={(event) => {
                    event.stopPropagation()
                    onClose(tab)
                  }}
                >
                  Fechar comanda
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
