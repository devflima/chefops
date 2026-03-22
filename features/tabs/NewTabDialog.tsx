import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function NewTabDialog({
  open,
  newTabLabel,
  newTabNotes,
  formError,
  isCreating,
  onOpenChange,
  onLabelChange,
  onNotesChange,
  onSubmit,
}: {
  open: boolean
  newTabLabel: string
  newTabNotes: string
  formError: string
  isCreating: boolean
  onOpenChange: (open: boolean) => void
  onLabelChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmit: () => void | Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova comanda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Identificador
            </label>
            <Input
              value={newTabLabel}
              onChange={(event) => onLabelChange(event.target.value)}
              placeholder="Ex: C-12, Balcao 3, Cliente Joao"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Observacoes
            </label>
            <textarea
              value={newTabNotes}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Opcional"
              className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-400"
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isCreating}
              onClick={onSubmit}
            >
              {isCreating ? 'Criando...' : 'Criar comanda'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
