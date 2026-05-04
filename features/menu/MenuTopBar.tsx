import { ChefHat, ShoppingCart, Clock } from 'lucide-react'

export function MenuTopBar({
  tenantName,
  tableInfo,
  cartCount,
  onCartOpen,
  onOrdersHistoryOpen,
}: {
  tenantName: string
  tableInfo: { id: string; number: string } | null
  cartCount: number
  onCartOpen: () => void
  onOrdersHistoryOpen: () => void
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900">{tenantName}</h1>
            {tableInfo && <p className="text-xs text-slate-400">Mesa {tableInfo.number}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOrdersHistoryOpen}
            className="hidden sm:flex items-center gap-2 text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Clock className="w-4 h-4" />
            Meus Pedidos
          </button>
          <button
            onClick={onOrdersHistoryOpen}
            className="sm:hidden flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
          >
            <Clock className="w-5 h-5" />
          </button>
          <button
            onClick={onCartOpen}
            className="relative flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
