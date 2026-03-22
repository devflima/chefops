import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildSelectedTenantHighlights, type AdminTenant } from '@/features/admin/admin-tenants-page'

export function AdminTenantManagementDialog({
  selected,
  newPlan,
  newBillingDate,
  suspendReason,
  saving,
  onOpenChange,
  onPlanChange,
  onBillingDateChange,
  onSuspendReasonChange,
  onSave,
  onSuspend,
  onReactivate,
}: {
  selected: AdminTenant | null
  newPlan: 'free' | 'basic' | 'pro'
  newBillingDate: string
  suspendReason: string
  saving: boolean
  onOpenChange: (open: boolean) => void
  onPlanChange: (value: 'free' | 'basic' | 'pro') => void
  onBillingDateChange: (value: string) => void
  onSuspendReasonChange: (value: string) => void
  onSave: () => void
  onSuspend: () => void
  onReactivate: () => void
}) {
  const selectedHighlights = selected ? buildSelectedTenantHighlights(selected) : []

  return (
    <Dialog open={!!selected} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{selected?.name}</DialogTitle>
        </DialogHeader>

        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {selectedHighlights.map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              ))}
            </div>

            {selected.status === 'suspended' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-1 text-xs font-medium text-red-700">Motivo da suspensão</p>
                <p className="text-sm text-red-600">{selected.suspension_reason}</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Plano</label>
              <Select value={newPlan} onValueChange={(value) => onPlanChange(value as typeof newPlan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Basic</SelectItem>
                  <SelectItem value="basic">Standard - R$ 89/mês</SelectItem>
                  <SelectItem value="pro">Premium - R$ 189/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Próxima cobrança</label>
              <Input type="date" value={newBillingDate} onChange={(e) => onBillingDateChange(e.target.value)} />
            </div>

            {selected.status !== 'suspended' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Motivo da suspensão</label>
                <Input
                  placeholder="Ex: Inadimplência - fatura vencida há 7 dias"
                  value={suspendReason}
                  onChange={(e) => onSuspendReasonChange(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={onSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>

              {selected.status === 'suspended' ? (
                <Button
                  variant="outline"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                  onClick={onReactivate}
                  disabled={saving}
                >
                  Reativar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={onSuspend}
                  disabled={saving || !suspendReason.trim()}
                >
                  Suspender
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
