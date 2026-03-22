import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function MenuDashboardHeader({
  availableCount,
  inactiveCount,
  limitLabel,
  menuItemLimitReached,
  onCreate,
}: {
  availableCount: number
  inactiveCount: number
  limitLabel: string
  menuItemLimitReached: boolean
  onCreate: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cardápio</h1>
        <p className="text-slate-500 text-sm mt-1">
          {availableCount} itens disponíveis
          {inactiveCount > 0 && ` · ${inactiveCount} inativo${inactiveCount > 1 ? 's' : ''}`}
          {limitLabel ? ` · ${limitLabel}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreate} disabled={menuItemLimitReached}>
          <Plus className="w-4 h-4 mr-2" /> Novo item
        </Button>
      </div>
    </div>
  )
}
