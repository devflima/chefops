import { X } from 'lucide-react'
import type { PublicMenuItem } from '@/features/menu/public-menu'

export function HalfFlavorModal({
  item,
  options,
  onClose,
  onSelect,
}: {
  item: PublicMenuItem
  options: PublicMenuItem[]
  onClose: () => void
  onSelect: (flavor: PublicMenuItem) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Escolha o segundo sabor</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Primeiro: <strong>{item.name}</strong>
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {options.map((flavor) => (
            <button
              key={flavor.id}
              onClick={() => onSelect(flavor)}
              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-colors"
            >
              <p className="font-medium text-slate-900 text-sm">{flavor.name}</p>
              {flavor.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{flavor.description}</p>}
              <p className="text-xs font-medium text-slate-700 mt-1">
                R$ {Number(Math.max(item.price, flavor.price)).toFixed(2)}
                <span className="text-slate-400 font-normal ml-1">(maior preço)</span>
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
