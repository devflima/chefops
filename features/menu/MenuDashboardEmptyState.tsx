import { Button } from '@/components/ui/button'
import { UtensilsCrossed } from 'lucide-react'

export function MenuDashboardEmptyState({
  menuItemLimitReached,
  onCreate,
}: {
  menuItemLimitReached: boolean
  onCreate: () => void
}) {
  return (
    <div className="p-12 text-center">
      <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">Nenhum item encontrado para os filtros atuais.</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={onCreate}
        disabled={menuItemLimitReached}
      >
        Adicionar primeiro item
      </Button>
    </div>
  )
}
