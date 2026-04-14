import { Plus } from 'lucide-react'
import {
  getBorders,
  groupOptionalExtras,
  type MenuExtra,
  type PublicMenuItem,
} from '@/features/menu/public-menu'

export function MenuItemCard({
  item,
  selectedBorder,
  selectedExtras = [],
  onAdd,
  onBorderToggle,
  onExtraToggle = () => {},
  onHalfFlavor,
  disabled = false,
}: {
  item: PublicMenuItem
  selectedBorder: MenuExtra | null
  selectedExtras?: MenuExtra[]
  onAdd: () => void
  onBorderToggle: (border: MenuExtra | null) => void
  onExtraToggle?: (extra: MenuExtra) => void
  onHalfFlavor: () => void
  disabled?: boolean
}) {
  const borders = getBorders(item)
  const groupedOptionalExtras = groupOptionalExtras(item)
  const selectedSummary = [
    ...(selectedBorder ? [`Borda ${selectedBorder.name}`] : []),
    ...selectedExtras.map((extra) => extra.name),
  ]
  const selectedExtrasTotal = (selectedBorder ? Number(selectedBorder.price) : 0) +
    selectedExtras.reduce((total, extra) => total + Number(extra.price), 0)
  const selectedItemTotal = Number(item.price) + selectedExtrasTotal
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
          {disabled && (
            <p className="text-xs text-amber-700 mt-2">Estabelecimento fechado para novos pedidos</p>
          )}
        </div>
        <button
          onClick={onAdd}
          disabled={disabled}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-700'}`}
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
              disabled={disabled}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${disabled ? 'border-slate-200 text-slate-400 cursor-not-allowed' : !selectedBorder ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Normal
            </button>
            {borders.map((border) => (
              <button
                key={border.id}
                onClick={() => onBorderToggle(selectedBorder?.id === border.id ? null : border)}
                disabled={disabled}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${disabled ? 'border-slate-200 text-slate-400 cursor-not-allowed' : selectedBorder?.id === border.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {border.name} +R$ {Number(border.price).toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSummary.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-1">
          <p>
            <span className="font-medium text-slate-700">Selecionados:</span> {selectedSummary.join(', ')}
          </p>
          <p>
            <span className="font-medium text-slate-700">Total com adicionais:</span> R$ {selectedItemTotal.toFixed(2)}
          </p>
        </div>
      )}

      {groupedOptionalExtras.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          {groupedOptionalExtras.map((group) => (
            <div key={group.category}>
              <p className="text-xs font-medium text-slate-500 mb-1">{group.label}</p>
              <p className="text-[11px] text-slate-400 mb-2">
                {group.category === 'flavor' ? 'Escolha 1 opção' : 'Escolha quantos quiser'}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.extras.map((extra) => {
                  const isSelected = selectedExtras.some((entry) => entry.id === extra.id)

                  return (
                    <button
                      key={extra.id}
                      onClick={() => onExtraToggle(extra)}
                      disabled={disabled}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${disabled ? 'border-slate-200 text-slate-400 cursor-not-allowed' : isSelected ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {extra.name} +R$ {Number(extra.price).toFixed(2)}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isPizzaCategory && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={onHalfFlavor}
            disabled={disabled}
            className={`text-xs underline underline-offset-2 ${disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900'}`}
          >
            + Pedir meia a meia
          </button>
        </div>
      )}
    </div>
  )
}
