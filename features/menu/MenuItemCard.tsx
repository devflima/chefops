import { Plus } from 'lucide-react'
import { getBorders, type PublicMenuItem } from '@/features/menu/public-menu'
import type { Extra } from '@/features/orders/types'

export function MenuItemCard({
  item,
  selectedBorder,
  onAdd,
  onBorderToggle,
  onHalfFlavor,
}: {
  item: PublicMenuItem
  selectedBorder: Extra | null
  onAdd: () => void
  onBorderToggle: (border: Extra | null) => void
  onHalfFlavor: () => void
}) {
  const borders = getBorders(item)
  const isPizzaCategory = item.category?.name?.toLowerCase().includes('pizza') ?? false

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900">{item.name}</p>
          {item.description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <p className="text-sm font-semibold text-slate-900 mt-1">
            R$ {Number(item.price).toFixed(2)}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-3 h-3 text-white" />
        </button>
      </div>

      {borders.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">Borda</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onBorderToggle(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!selectedBorder ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Normal
            </button>
            {borders.map((border) => (
              <button
                key={border.id}
                onClick={() => onBorderToggle(selectedBorder?.id === border.id ? null : border)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedBorder?.id === border.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {border.name} +R$ {Number(border.price).toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isPizzaCategory && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={onHalfFlavor}
            className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
          >
            + Pedir meia a meia
          </button>
        </div>
      )}
    </div>
  )
}
