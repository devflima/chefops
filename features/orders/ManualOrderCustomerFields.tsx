import { Input } from '@/components/ui/input'

export function ManualOrderCustomerFields({
  customerName,
  customerPhone,
  notes,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onNotesChange,
}: {
  customerName: string
  customerPhone: string
  notes: string
  onCustomerNameChange: (value: string) => void
  onCustomerPhoneChange: (value: string) => void
  onNotesChange: (value: string) => void
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Cliente</label>
          <Input
            value={customerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Telefone</label>
          <Input
            value={customerPhone}
            onChange={(event) => onCustomerPhoneChange(event.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Observacoes</label>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Ex: sem cebola, prioridade alta, cliente retira no caixa"
          className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-slate-400"
        />
      </div>
    </>
  )
}
