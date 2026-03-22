import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getLiveTotal } from '@/features/tabs/tabs-page'
import type { Tab } from '@/features/tabs/types'

export function TabDetailsDialog({
  selectedTab,
  onOpenChange,
  onCloseTab,
}: {
  selectedTab: Tab | null
  onOpenChange: (open: boolean) => void
  onCloseTab: (tab: Tab) => void | Promise<void>
}) {
  if (!selectedTab) return null

  return (
    <Dialog open={!!selectedTab} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Comanda {selectedTab.label}</DialogTitle>
        </DialogHeader>

        <div>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">Status</span>
            <Badge variant={selectedTab.status === 'open' ? 'default' : 'secondary'}>
              {selectedTab.status === 'open' ? 'Aberta' : 'Fechada'}
            </Badge>
          </div>

          <div className="mb-4 space-y-1 text-sm text-slate-500">
            <p>
              Aberta em{' '}
              {new Date(selectedTab.created_at).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {selectedTab.closed_at && (
              <p>
                Fechada em{' '}
                {new Date(selectedTab.closed_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            {selectedTab.notes && <p>Obs: {selectedTab.notes}</p>}
          </div>

          {selectedTab.orders?.length ? (
            <div className="mb-4 space-y-2">
              {selectedTab.orders.map((order) => (
                <div key={order.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium capitalize">{order.status}</span>
                    <span className="font-semibold">
                      R$ {Number(order.total).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pagamento: {order.payment_status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4 py-6 text-center text-sm text-slate-400">
              Nenhum pedido vinculado a esta comanda.
            </div>
          )}

          <div className="flex justify-between border-t pt-3 font-semibold text-slate-900">
            <span>Total</span>
            <span>R$ {getLiveTotal(selectedTab).toFixed(2)}</span>
          </div>

          {selectedTab.status === 'open' && (
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={async () => {
                await onCloseTab(selectedTab)
                onOpenChange(false)
              }}
            >
              Fechar comanda
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
