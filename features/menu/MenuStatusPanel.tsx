import { PublicOrderStatusCard } from '@/features/menu/PublicOrderStatusCard'
import { getCheckoutNoticeTone, type PublicOrderStatus } from '@/features/menu/public-menu'

export function MenuStatusPanel({
  checkoutNotice,
  publicOrderStatus,
  cartOpen,
  headline,
  onTrackOrder,
  tableInfo,
}: {
  checkoutNotice: string | null
  publicOrderStatus: PublicOrderStatus | null
  cartOpen: boolean
  headline: string | null
  onTrackOrder: () => void
  tableInfo: { id: string; number: string } | null
}) {
  const checkoutNoticeTone = getCheckoutNoticeTone(publicOrderStatus)

  return (
    <>
      {checkoutNotice && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            checkoutNoticeTone === 'danger'
              ? 'border border-red-200 bg-red-50 text-red-700'
              : checkoutNoticeTone === 'success'
                ? 'border border-green-200 bg-green-50 text-green-700'
                : 'border border-blue-200 bg-blue-50 text-blue-700'
          }`}
        >
          {checkoutNotice}
        </div>
      )}

      {publicOrderStatus && !cartOpen && !['delivered', 'cancelled'].includes(publicOrderStatus.status) && headline && (
        <PublicOrderStatusCard
          publicOrderStatus={publicOrderStatus}
          headline={headline}
          onTrack={onTrackOrder}
        />
      )}

      {tableInfo && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 text-sm text-orange-700">
          Você está na <strong>Mesa {tableInfo.number}</strong>
        </div>
      )}
    </>
  )
}
