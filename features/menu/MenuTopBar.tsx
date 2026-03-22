import { ChefHat, ShoppingCart } from 'lucide-react'

export function MenuTopBar({
  tenantName,
  tableInfo,
  cartCount,
  onCartOpen,
}: {
  tenantName: string
  tableInfo: { id: string; number: string } | null
  cartCount: number
  onCartOpen: () => void
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
        <button
          onClick={onCartOpen}
          className="relative flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <ShoppingCart className="w-4 h-4" />
          Carrinho
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
