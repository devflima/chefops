import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getCustomerBannerState,
  getInfoContinueLabel,
  shouldRequirePhoneVerification,
} from '@/features/menu/public-menu'
import type { CustomerAddress } from '@/features/orders/types'

type ExistingCustomer = {
  id: string
  name: string
  phone: string
  addresses?: CustomerAddress[]
} | null

export function MenuInfoStep({
  tableInfo,
  phone,
  onPhoneChange,
  phoneVerified,
  onPhoneLookup,
  verificationCode,
  onVerificationCodeChange,
  onVerifyPhoneCode,
  codeSent,
  lookingUpPhone,
  verifyingPhoneCode,
  errors,
  isPaidPlan,
  existingCustomer,
  isNewCustomer,
  customerName,
  onCustomerNameChange,
  customerCpf,
  onCustomerCpfChange,
  paymentOptions,
  paymentMethod,
  onPaymentMethodChange,
  notes,
  onNotesChange,
  cartTotal,
  deliveryFee,
  orderTotal,
  isProcessing,
  onContinue,
  onBack,
  disabled = false,
}: {
  tableInfo: { id: string; number: string } | null
  phone: string
  onPhoneChange: (value: string) => void
  phoneVerified: boolean
  onPhoneLookup: () => void
  verificationCode: string
  onVerificationCodeChange: (value: string) => void
  onVerifyPhoneCode: () => void
  codeSent: boolean
  lookingUpPhone: boolean
  verifyingPhoneCode: boolean
  errors: Record<string, string>
  isPaidPlan: boolean
  existingCustomer: ExistingCustomer
  isNewCustomer: boolean
  customerName: string
  onCustomerNameChange: (value: string) => void
  customerCpf: string
  onCustomerCpfChange: (value: string) => void
  paymentOptions: Array<{ value: string; label: string }>
  paymentMethod: string
  onPaymentMethodChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  cartTotal: number
  deliveryFee: number
  orderTotal: number
  isProcessing: boolean
  onContinue: () => void
  onBack: () => void
  disabled?: boolean
}) {
  const customerBannerState = getCustomerBannerState(isPaidPlan, existingCustomer, isNewCustomer)
  const requirePhoneVerification = shouldRequirePhoneVerification(isPaidPlan, tableInfo)

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-4 space-y-4">
        {tableInfo && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
            Pedido na comanda da <strong>Mesa {tableInfo.number}</strong>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Nome completo <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Ex: João Silva"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            disabled={disabled || (isPaidPlan && !!existingCustomer)}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Telefone <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <Input
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              className="flex-1"
              disabled={disabled}
            />
            {requirePhoneVerification && !phoneVerified && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPhoneLookup}
                disabled={disabled || lookingUpPhone || phone.replace(/\D/g, '').length < 10}
                className="w-full"
              >
                {lookingUpPhone ? 'Enviando...' : codeSent ? 'Reenviar código' : 'Enviar código'}
              </Button>
            )}
          </div>
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          {requirePhoneVerification && !phoneVerified && codeSent && (
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Digite o código de 6 dígitos"
                value={verificationCode}
                onChange={(e) => onVerificationCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                disabled={disabled}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={onVerifyPhoneCode}
                disabled={disabled || verifyingPhoneCode || verificationCode.length !== 6}
              >
                {verifyingPhoneCode ? 'Confirmando...' : 'Confirmar código'}
              </Button>
            </div>
          )}
          {customerBannerState === 'existing' && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <p className="text-xs text-green-700">
                Olá, <strong>{existingCustomer?.name}</strong>!
              </p>
            </div>
          )}
          {customerBannerState === 'new' && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-700">Primeiro pedido? Preencha seus dados.</p>
            </div>
          )}
        </div>

        {tableInfo && (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              CPF <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="000.000.000-00"
              value={customerCpf}
              onChange={(e) => onCustomerCpfChange(e.target.value)}
              maxLength={14}
              disabled={disabled}
            />
            {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Forma de pagamento</label>
          <div className="grid grid-cols-2 gap-2">
            {paymentOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onPaymentMethodChange(value)}
                disabled={disabled}
                className={`text-xs p-2.5 rounded-lg border text-center transition-colors ${paymentMethod === value ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            Observações <span className="text-slate-400">(opcional)</span>
          </label>
          <Input placeholder="Ex: sem cebola" value={notes} onChange={(e) => onNotesChange(e.target.value)} disabled={disabled} />
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-2">
        {disabled && (
          <p className="text-xs text-amber-700">Estabelecimento fechado para novos pedidos</p>
        )}
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500">Subtotal</span>
          <span className="font-semibold">R$ {cartTotal.toFixed(2)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Taxa de entrega</span>
            <span className="font-semibold">R$ {deliveryFee.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total</span>
          <span className="font-semibold">R$ {orderTotal.toFixed(2)}</span>
        </div>
        <Button
          className="w-full"
          onClick={onContinue}
          disabled={disabled || isProcessing || (requirePhoneVerification && !phoneVerified)}
        >
          {getInfoContinueLabel(isProcessing)}
        </Button>
        <Button variant="outline" className="w-full" onClick={onBack} disabled={disabled}>
          Voltar
        </Button>
      </div>
    </div>
  )
}
