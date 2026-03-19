'use client'

import { Button } from '@/components/ui/button'

type Props = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: Props) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  )
}
