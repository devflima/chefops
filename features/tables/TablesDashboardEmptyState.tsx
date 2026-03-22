import { Button } from '@/components/ui/button'

export function TablesDashboardEmptyState({
  tableLimitReached,
  onCreate,
}: {
  tableLimitReached: boolean
  onCreate: () => void
}) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-slate-500">Nenhuma mesa cadastrada.</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={onCreate}
        disabled={tableLimitReached}
      >
        Cadastrar primeira mesa
      </Button>
    </div>
  )
}
