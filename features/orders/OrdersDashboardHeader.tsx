import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function OrdersDashboardHeader({
  onCreate,
}: {
  onCreate: () => void
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pedidos</h1>
        <p className="mt-1 text-sm text-slate-500">Atualiza automaticamente a cada 15 segundos</p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Novo pedido
      </Button>
    </div>
  )
}
