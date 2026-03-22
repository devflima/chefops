import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function TabsDashboardHeader({
  openCount,
  closedCount,
  onCreate,
}: {
  openCount: number
  closedCount: number
  onCreate: () => void
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Comandas</h1>
        <p className="mt-1 text-sm text-slate-500">
          {openCount} aberta{openCount !== 1 ? 's' : ''} · {closedCount} fechada
          {closedCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova comanda
        </Button>
      </div>
    </div>
  )
}
