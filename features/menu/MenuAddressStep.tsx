import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCEP, getAddressSubmitLabel } from '@/features/menu/public-menu'
import type { CustomerAddress } from '@/features/orders/types'

export function MenuAddressStep({
  address,
  onAddressChange,
  onCepLookup,
  loadingCep,
  errors,
  paymentMethod,
  isProcessing,
  onSubmit,
  onBack,
}: {
  address: Partial<CustomerAddress>
  onAddressChange: (updater: (prev: Partial<CustomerAddress>) => Partial<CustomerAddress>) => void
  onCepLookup: (cep: string) => void
  loadingCep: boolean
  errors: Record<string, string>
  paymentMethod: string
  isProcessing: boolean
  onSubmit: () => void
  onBack: () => void
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 space-y-4">
        <p className="text-sm text-slate-500">Informe o endereço de entrega.</p>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            CEP <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="00000-000"
              value={address.zip_code ? formatCEP(address.zip_code) : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                onAddressChange((prev) => ({ ...prev, zip_code: value }))
                if (value.length === 8) onCepLookup(value)
              }}
              maxLength={9}
              className="flex-1"
            />
            {loadingCep && <span className="text-xs text-slate-400 self-center">Buscando...</span>}
          </div>
          {errors.zip_code && <p className="text-xs text-red-500 mt-1">{errors.zip_code}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Rua</label>
          <Input
            placeholder="Nome da rua"
            value={address.street ?? ''}
            onChange={(e) => onAddressChange((prev) => ({ ...prev, street: e.target.value }))}
          />
          {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Número</label>
            <Input
              placeholder="123"
              value={address.number ?? ''}
              onChange={(e) => onAddressChange((prev) => ({ ...prev, number: e.target.value }))}
            />
            {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Complemento</label>
            <Input
              placeholder="Apto..."
              value={address.complement ?? ''}
              onChange={(e) => onAddressChange((prev) => ({ ...prev, complement: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Bairro</label>
          <Input
            placeholder="Bairro"
            value={address.neighborhood ?? ''}
            onChange={(e) => onAddressChange((prev) => ({ ...prev, neighborhood: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Cidade</label>
            <Input
              placeholder="Cidade"
              value={address.city ?? ''}
              onChange={(e) => onAddressChange((prev) => ({ ...prev, city: e.target.value }))}
            />
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Estado</label>
            <Input
              placeholder="UF"
              maxLength={2}
              value={address.state ?? ''}
              onChange={(e) => onAddressChange((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
            />
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-slate-200 space-y-2">
        <Button className="w-full" onClick={onSubmit} disabled={isProcessing}>
          {getAddressSubmitLabel(paymentMethod, isProcessing)}
        </Button>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Voltar
        </Button>
      </div>
    </div>
  )
}
