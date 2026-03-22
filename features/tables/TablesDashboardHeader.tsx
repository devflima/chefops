import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function TablesDashboardHeader({
  occupied,
  available,
  tableCount,
  maxTables,
  tableLimitReached,
  onCreate,
}: {
  occupied: number
  available: number
  tableCount: number
  maxTables: number | undefined
  tableLimitReached: boolean
  onCreate: () => void
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mesas</h1>
        <p className="mt-1 text-sm text-slate-500">
          {occupied} ocupada{occupied !== 1 ? 's' : ''} · {available} livre
          {available !== 1 ? 's' : ''}
          {maxTables !== undefined && maxTables !== -1 ? ` · ${tableCount}/${maxTables} mesas` : ''}
        </p>
      </div>
      <Button onClick={onCreate} disabled={tableLimitReached}>
        <Plus className="mr-2 h-4 w-4" /> Nova mesa
      </Button>
    </div>
  )
}
