import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getTableFormDialogTitle,
  getTableFormSubmitLabel,
} from '@/features/tables/tables-page'
import type { Table } from '@/features/tables/types'

export function TableFormDialog({
  open,
  editingTable,
  errorMessage,
  isSubmitting,
  onOpenChange,
  children,
}: {
  open: boolean
  editingTable: Table | null
  errorMessage?: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTableFormDialogTitle(editingTable)}</DialogTitle>
        </DialogHeader>
        {children}
        {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {getTableFormSubmitLabel(isSubmitting)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
