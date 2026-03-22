import { PublicOrderStatusCard } from '@/features/menu/PublicOrderStatusCard'
import type { PublicOrderStatus } from '@/features/menu/public-menu'

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
  return (
    <>
      {checkoutNotice && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
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
