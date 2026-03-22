import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { MenuItem } from '@/features/orders/types'

export function MenuDashboardTable({
  items,
  deletingId,
  onEdit,
  onToggleAvailable,
}: {
  items: MenuItem[]
  deletingId: string | null
  onEdit: (item: MenuItem) => void
  onToggleAvailable: (item: MenuItem) => void
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {['Item', 'Categoria', 'Preço', 'Status', ''].map((header) => (
            <th
              key={header}
              className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((item) => (
          <tr
            key={item.id}
            className={`hover:bg-slate-50 transition-colors ${!item.available ? 'opacity-60' : ''}`}
          >
            <td className="px-4 py-3">
              <p className="font-medium text-slate-900">{item.name}</p>
              {item.description && (
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
              )}
            </td>
            <td className="px-4 py-3 text-slate-500">{item.category?.name ?? '—'}</td>
            <td className="px-4 py-3 font-medium text-slate-900">
              R$ {Number(item.price).toFixed(2)}
            </td>
            <td className="px-4 py-3">
              <Badge variant={item.available ? 'default' : 'secondary'}>
                {item.available ? 'Disponível' : 'Indisponível'}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1 justify-end">
                {item.available ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onToggleAvailable(item)}
                      disabled={deletingId === item.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => onToggleAvailable(item)}
                    disabled={deletingId === item.id}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Reativar
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
