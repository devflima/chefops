import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import type { CartItem } from '@/features/orders/types'
import { getCartItemLineTotal } from '@/features/menu/public-menu'

export function MenuCartStep({
  cart,
  cartTotal,
  deliveryFee,
  orderTotal,
  onIncrement,
  onDecrement,
  onRemove,
  onContinue,
  onClear,
  disabled = false,
}: {
  cart: CartItem[]
  cartTotal: number
  deliveryFee: number
  orderTotal: number
  onIncrement: (index: number) => void
  onDecrement: (index: number) => void
  onRemove: (index: number) => void
  onContinue: () => void
  onClear: () => void
  disabled?: boolean
}) {
  if (cart.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Nenhum item adicionado.
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 space-y-3">
        {cart.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
              <button
                onClick={() => onDecrement(idx)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
              <button
                onClick={() => onIncrement(idx)}
                disabled={disabled}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-700'}`}
              >
                <Plus className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{item.name}</p>
              {item.extras?.map((extra) => (
                <p key={extra.name} className="text-xs text-slate-400">
                  + {extra.name} R$ {extra.price.toFixed(2)}
                </p>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-medium text-slate-900">
                R$ {getCartItemLineTotal(item).toFixed(2)}
              </span>
              <button
                onClick={() => onRemove(idx)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex justify-between text-sm mb-4">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-semibold text-slate-900">R$ {cartTotal.toFixed(2)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Taxa de entrega</span>
            <span className="font-medium text-slate-900">R$ {deliveryFee.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total</span>
          <span className="font-semibold text-slate-900">R$ {orderTotal.toFixed(2)}</span>
        </div>
        {disabled && (
          <p className="text-xs text-amber-700 mb-2">Estabelecimento fechado para novos pedidos</p>
        )}
        <Button className="w-full mb-2" onClick={onContinue} disabled={disabled}>
          Continuar
        </Button>
        <button
          onClick={onClear}
          className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-500 py-2 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Limpar carrinho
        </button>
      </div>
    </div>
  )
}
