import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getOpenSessionSubmitLabel } from '@/features/tables/tables-page'
import type { Table } from '@/features/tables/types'

export function OpenSessionDialog({
  table,
  open,
  errorMessage,
  isSubmitting,
  onOpenChange,
  children,
}: {
  table: Table | null
  open: boolean
  errorMessage?: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir comanda - Mesa {table?.number}</DialogTitle>
        </DialogHeader>
        {children}
        {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {getOpenSessionSubmitLabel(isSubmitting)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
