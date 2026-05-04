import { PublicOrderStatusCard } from '@/features/menu/PublicOrderStatusCard'
import {
  getCheckoutNoticeTone,
  shouldShowCheckoutNoticeBanner,
  type PublicOrderStatus,
} from '@/features/menu/public-menu'

export function MenuStatusPanel({
  checkoutNotice,
  publicOrderStatus,
  cartOpen,
  onTrackOrder,
  tableInfo,
  activeOrdersCount = 0,
}: {
  checkoutNotice: string | null
  publicOrderStatus: PublicOrderStatus | null
  cartOpen: boolean
  onTrackOrder: () => void
  tableInfo: { id: string; number: string } | null
  activeOrdersCount?: number
}) {
  const checkoutNoticeTone = getCheckoutNoticeTone(publicOrderStatus)
  const shouldShowNotice = shouldShowCheckoutNoticeBanner({
    checkoutNotice,
    publicOrderStatus,
    cartOpen,
  })

  const othersCount = activeOrdersCount - (publicOrderStatus && !['delivered', 'cancelled'].includes(publicOrderStatus.status) ? 1 : 0)

  return (
    <>
      {shouldShowNotice && checkoutNotice && (
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

      {publicOrderStatus && !cartOpen && !['delivered', 'cancelled'].includes(publicOrderStatus.status) && (
        <PublicOrderStatusCard
          publicOrderStatus={publicOrderStatus}
          onTrack={onTrackOrder}
          othersCount={Math.max(0, othersCount)}
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
