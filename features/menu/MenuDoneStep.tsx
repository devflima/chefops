import { Button } from '@/components/ui/button'
import { ChefHat } from 'lucide-react'
import {
  getCancelledOrderMessage,
  getPublicOrderCompletionCloseLabel,
  getDeliveryStepMessage,
  getPaymentStatusLabel,
  getPublicOrderCompletionTitle,
  getPublicOrderCompletionSubtitle,
  getPublicOrderProgressTitle,
  getPublicOrderReferenceLabel,
  isDeliveryStepCompleted,
  shouldShowPublicDeliveryConfirmButton,
  shouldShowCancelOrderButton,
  shouldShowDeliveryStep,
  type PublicOrderStatus,
} from '@/features/menu/public-menu'

export function MenuDoneStep({
  orderNumber,
  tableInfo,
  publicOrderStatus,
  orderSteps,
  getStepState,
  cancelOrderLoading,
  confirmDeliveryLoading,
  onCancelOrder,
  onConfirmDelivery,
  onClose,
}: {
  orderNumber: number | null
  tableInfo: { id: string; number: string } | null
  publicOrderStatus: PublicOrderStatus | null
  orderSteps: Array<{ key: PublicOrderStatus['status']; label: string; description: string }>
  getStepState: (stepKey: PublicOrderStatus['status']) => 'done' | 'current' | 'upcoming'
  cancelOrderLoading: boolean
  confirmDeliveryLoading: boolean
  onCancelOrder: () => void
  onConfirmDelivery: () => void
  onClose: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <ChefHat className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {getPublicOrderCompletionTitle({
          tableInfo,
          paymentMethod: publicOrderStatus?.payment_method,
        })}
      </h3>
      <p className="text-slate-500 text-sm mb-1">
        {getPublicOrderCompletionSubtitle({
          tableInfo,
          paymentMethod: publicOrderStatus?.payment_method,
        })}
      </p>
      <p className="text-slate-500 text-sm mb-1">
        {getPublicOrderReferenceLabel({
          tableInfo,
          paymentMethod: publicOrderStatus?.payment_method,
        })}
      </p>
      <p className="text-4xl font-bold text-slate-900 mb-4">#{orderNumber}</p>
      {tableInfo && (
        <p className="text-sm text-slate-500">
          Comanda da <strong>Mesa {tableInfo.number}</strong>
        </p>
      )}
      {publicOrderStatus?.status === 'cancelled' ? (
        <div className="mt-6 w-full rounded-xl border border-red-200 bg-red-50 p-4 text-left">
          <p className="font-medium text-red-700">Pedido cancelado</p>
          <p className="mt-1 text-sm text-red-600">{getCancelledOrderMessage(publicOrderStatus)}</p>
          {publicOrderStatus.payment_status === 'refunded' && (
            <p className="mt-2 text-xs text-red-500">
              Reembolso solicitado com sucesso no pagamento online.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <p className="mb-4 text-sm font-medium text-slate-700">
            {getPublicOrderProgressTitle({
              tableInfo,
              paymentMethod: publicOrderStatus?.payment_method,
            })}
          </p>
          <div className="space-y-3">
            {orderSteps.map((step) => {
              const state = getStepState(step.key)
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                      state === 'done'
                        ? 'border-green-500 bg-green-500 text-white'
                        : state === 'current'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-400'
                    }`}
                  >
                    {state === 'done' ? '✓' : ''}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-900'}`}>
                      {step.label}
                    </p>
                    <p className={`text-xs ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}

            {shouldShowDeliveryStep(publicOrderStatus) && (
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                    isDeliveryStepCompleted(publicOrderStatus)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {isDeliveryStepCompleted(publicOrderStatus) ? '✓' : ''}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Saiu para entrega</p>
                  <p className="text-xs text-slate-500">{getDeliveryStepMessage(publicOrderStatus)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
            <span>Pagamento</span>
            <span className="font-medium text-slate-700">
              {getPaymentStatusLabel(publicOrderStatus?.payment_status, publicOrderStatus?.payment_method)}
            </span>
          </div>

          {shouldShowPublicDeliveryConfirmButton(publicOrderStatus) && (
              <Button
                className="mt-4 w-full"
                onClick={onConfirmDelivery}
                disabled={confirmDeliveryLoading}
              >
                {confirmDeliveryLoading ? 'Confirmando...' : 'Confirmar recebimento'}
              </Button>
            )}

          {shouldShowCancelOrderButton(publicOrderStatus?.status) && (
            <Button
              variant="outline"
              className="mt-4 w-full border-red-200 text-red-700 hover:bg-red-50"
              onClick={onCancelOrder}
              disabled={cancelOrderLoading}
            >
              {cancelOrderLoading ? 'Cancelando...' : 'Cancelar pedido'}
            </Button>
          )}
        </div>
      )}
      <Button className="mt-8 w-full" onClick={onClose}>
        {getPublicOrderCompletionCloseLabel({
          tableInfo,
          paymentMethod: publicOrderStatus?.payment_method,
        })}
      </Button>
    </div>
  )
}
