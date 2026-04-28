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
  cartTotal = 0,
  deliveryFee = 0,
  orderTotal = 0,
  hasDeliveryQuoteError = false,
  existingAddresses = [],
  onDeleteAddress,
  onSaveAddress,
  editingId = null,
  setEditingId,
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
  cartTotal?: number
  deliveryFee?: number
  orderTotal?: number
  hasDeliveryQuoteError?: boolean
  existingAddresses?: CustomerAddress[]
  onDeleteAddress?: (id: string) => void
  onSaveAddress?: () => void
  editingId?: string | null
  setEditingId?: (id: string | null) => void
}) {
  const isNewAddressMode = existingAddresses.length === 0 || (!address.id && editingId === null)

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 space-y-4">
        <p className="text-sm text-slate-500">Informe o endereço de entrega.</p>

        {existingAddresses.length > 0 && (
          <div className="space-y-2 mb-6">
            <label className="text-sm font-medium text-slate-700 block mb-2">Seus endereços</label>
            {existingAddresses.map((addr) => (
              <div
                key={addr.id}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  address.id === addr.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="address_selection"
                  checked={address.id === addr.id && editingId === null}
                  onChange={() => {
                    if (setEditingId) setEditingId(null)
                    onAddressChange(() => addr)
                  }}
                  className="mt-1"
                />
                <div className="flex-1" onClick={() => {
                  if (setEditingId) setEditingId(null)
                  onAddressChange(() => addr)
                }}>
                  <p className="text-sm font-medium text-slate-900">{addr.label || 'Endereço'}</p>
                  <p className="text-xs text-slate-500">
                    {addr.street}, {addr.number}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddressChange(() => addr)
                      if (setEditingId) setEditingId(addr.id || null)
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (addr.id && onDeleteAddress) onDeleteAddress(addr.id)
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
            {existingAddresses.length < 3 && (
              <label
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isNewAddressMode ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="address_selection"
                  checked={isNewAddressMode && editingId === null}
                  onChange={() => {
                    if (setEditingId) setEditingId(null)
                    onAddressChange(() => ({}))
                  }}
                  className="mt-1"
                />
                <div className="text-sm font-medium text-slate-900">Cadastrar novo endereço</div>
              </label>
            )}
          </div>
        )}

        {(isNewAddressMode || (address.id && editingId === address.id)) && (
          <>
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
          </>
        )}
      </div>
      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>R$ {cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Taxa entrega</span>
            <span>{quotedDeliveryFee !== null ? `R$ ${deliveryFee.toFixed(2)}` : 'A calcular'}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total</span>
            <span>{quotedDeliveryFee !== null ? `R$ ${orderTotal.toFixed(2)}` : 'A calcular'}</span>
          </div>
        </div>
        {deliveryQuoteMessage && !disabled && (
          <p className={hasDeliveryQuoteError ? 'text-xs text-red-600' : 'text-xs text-slate-600'}>
            {deliveryQuoteMessage}
          </p>
        )}
        {disabled && (
          <p className="text-xs text-amber-700">Estabelecimento fechado para novos pedidos</p>
        )}
        {(isNewAddressMode || editingId === address.id) && onSaveAddress && (
          <Button type="button" variant="secondary" className="w-full" onClick={onSaveAddress} disabled={disabled || loadingCep}>
            Salvar endereço
          </Button>
        )}
        <Button className="w-full" onClick={onSubmit} disabled={disabled || isProcessing || hasDeliveryQuoteError}>
          {getAddressSubmitLabel(paymentMethod, isProcessing)}
        </Button>
        <Button variant="outline" className="w-full" onClick={onBack} disabled={disabled}>
          Voltar
        </Button>
      </div>
    </div>
  )
}
