import type { ComponentProps } from 'react'
import { X } from 'lucide-react'
import { MenuAddressStep } from '@/features/menu/MenuAddressStep'
import { MenuCartStep } from '@/features/menu/MenuCartStep'
import { MenuDoneStep } from '@/features/menu/MenuDoneStep'
import { MenuInfoStep } from '@/features/menu/MenuInfoStep'

type MenuCartStepProps = ComponentProps<typeof MenuCartStep>
type MenuInfoStepProps = ComponentProps<typeof MenuInfoStep>
type MenuAddressStepProps = ComponentProps<typeof MenuAddressStep>
type MenuDoneStepProps = ComponentProps<typeof MenuDoneStep>

export function MenuCheckoutDrawer({
  open,
  title,
  checkoutStep,
  onClose,
  onStepChange,
  cartStepProps,
  infoStepProps,
  addressStepProps,
  doneStepProps,
}: {
  open: boolean
  title: string
  checkoutStep: 'cart' | 'info' | 'address' | 'done'
  onClose: () => void
  onStepChange: (step: 'cart' | 'info' | 'address' | 'done') => void
  cartStepProps: MenuCartStepProps
  infoStepProps: MenuInfoStepProps
  addressStepProps: MenuAddressStepProps
  doneStepProps: MenuDoneStepProps
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {checkoutStep === 'cart' && (
          <MenuCartStep
            {...cartStepProps}
            onContinue={() => onStepChange('info')}
          />
        )}

        {checkoutStep === 'info' && (
          <MenuInfoStep
            {...infoStepProps}
            onBack={() => onStepChange('cart')}
          />
        )}

        {checkoutStep === 'address' && (
          <MenuAddressStep
            {...addressStepProps}
            onBack={() => onStepChange('info')}
          />
        )}

        {checkoutStep === 'done' && <MenuDoneStep {...doneStepProps} onClose={onClose} />}
      </div>
    </div>
  )
}
