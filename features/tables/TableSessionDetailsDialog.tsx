import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Table } from '@/features/tables/types'
import { getTableDetailsTotal } from '@/features/tables/tables-page'

export function TableSessionDetailsDialog({
  table,
  open,
  onOpenChange,
  onCloseSession,
}: {
  table: Table | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseSession: (table: Table) => void
}) {
  if (!table) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mesa {table.number}</DialogTitle>
        </DialogHeader>
        {table.active_session ? (
          <div>
            <div className="mb-4 flex justify-between text-sm">
              <span className="text-slate-500">Aberta às</span>
              <span className="font-medium">
                {new Date(table.active_session.opened_at).toLocaleTimeString('pt-BR')}
              </span>
            </div>
            <div className="mb-4 space-y-2">
              {table.active_session.orders?.map((order) => (
                <div key={order.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">Pedido #{order.order_number}</span>
                    <span className="font-semibold">R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                  {order.items?.map((item) => (
                    <p key={item.id} className="text-xs text-slate-500">
                      {item.quantity}× {item.name}
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-3 font-semibold text-slate-900">
              <span>Total</span>
              <span>R$ {getTableDetailsTotal(table)}</span>
            </div>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={() => onCloseSession(table)}
            >
              Fechar comanda
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-slate-400">
            Mesa livre - sem comanda aberta.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
