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
  disabled = false,
  quotedDeliveryFee = null,
  quotedDistanceKm = null,
  deliveryQuoteMessage = null,
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
  disabled?: boolean
  quotedDeliveryFee?: number | null
  quotedDistanceKm?: number | null
  deliveryQuoteMessage?: string | null
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
              disabled={disabled}
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
            disabled={disabled}
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
              disabled={disabled}
            />
            {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Complemento</label>
            <Input
              placeholder="Apto..."
              value={address.complement ?? ''}
              onChange={(e) => onAddressChange((prev) => ({ ...prev, complement: e.target.value }))}
              disabled={disabled}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Bairro</label>
          <Input
            placeholder="Bairro"
            value={address.neighborhood ?? ''}
            onChange={(e) => onAddressChange((prev) => ({ ...prev, neighborhood: e.target.value }))}
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Cidade</label>
            <Input
              placeholder="Cidade"
              value={address.city ?? ''}
              onChange={(e) => onAddressChange((prev) => ({ ...prev, city: e.target.value }))}
              disabled={disabled}
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
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-slate-200 space-y-2">
        {deliveryQuoteMessage && !disabled && (
          <p className="text-xs text-slate-600">{deliveryQuoteMessage}</p>
        )}
        {quotedDistanceKm !== null && !disabled && (
          <p className="text-xs text-slate-500">Distância estimada: {quotedDistanceKm.toFixed(1)} km</p>
        )}
        {quotedDeliveryFee !== null && !disabled && (
          <p className="text-xs text-slate-500">Taxa calculada: R$ {quotedDeliveryFee.toFixed(2)}</p>
        )}
        {disabled && (
          <p className="text-xs text-amber-700">Estabelecimento fechado para novos pedidos</p>
        )}
        <Button className="w-full" onClick={onSubmit} disabled={disabled || isProcessing}>
          {getAddressSubmitLabel(paymentMethod, isProcessing)}
        </Button>
        <Button variant="outline" className="w-full" onClick={onBack} disabled={disabled}>
          Voltar
        </Button>
      </div>
    </div>
  )
}
