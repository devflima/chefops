import { Button } from '@/components/ui/button'

export function TabsDashboardEmptyState({
  onCreate,
}: {
  onCreate: () => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center">
      <p className="text-sm text-slate-500">Nenhuma comanda avulsa aberta no momento.</p>
      <Button variant="outline" className="mt-4" onClick={onCreate}>
        Criar primeira comanda
      </Button>
    </div>
  )
}
