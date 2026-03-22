import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/features/orders/types'

export function ManualOrderSummary({
  summaryLabel,
  cart,
  total,
  errorMessage,
  submitting,
  onChangeQuantity,
  onRemoveItem,
  onCancel,
  onSubmit,
}: {
  summaryLabel: string
  cart: CartItem[]
  total: number
  errorMessage: string
  submitting: boolean
  onChangeQuantity: (menuItemId: string, delta: number) => void
  onRemoveItem: (menuItemId: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Resumo</h3>
          <p className="text-sm text-slate-500">{summaryLabel}</p>
        </div>
        <Badge>{cart.reduce((sum, item) => sum + item.quantity, 0)} itens</Badge>
      </div>

      <div className="space-y-2">
        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            Adicione itens para montar o pedido.
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.menu_item_id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">R$ {Number(item.price).toFixed(2)} cada</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.menu_item_id)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onChangeQuantity(item.menu_item_id, -1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-8 text-center text-sm font-medium text-slate-700">{item.quantity}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => onChangeQuantity(item.menu_item_id, 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="text-sm font-semibold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-semibold text-slate-900">R$ {total.toFixed(2)}</span>
        </div>

        {errorMessage && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 pt-1">
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" disabled={submitting} onClick={onSubmit}>
              {submitting ? 'Criando...' : 'Criar pedido'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
