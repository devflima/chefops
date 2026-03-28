import { Button } from '@/components/ui/button'
import {
  getPublicOrderStatusCardActionLabel,
  getPublicOrderStatusCardMessage,
  getPublicOrderStatusCardTitle,
  type PublicOrderStatus,
} from '@/features/menu/public-menu'

export function PublicOrderStatusCard({
  publicOrderStatus,
  onTrack,
}: {
  publicOrderStatus: PublicOrderStatus
  onTrack: () => void
}) {
  return (
    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            {getPublicOrderStatusCardTitle(publicOrderStatus)}
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            {getPublicOrderStatusCardMessage(publicOrderStatus)}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={onTrack}
        >
          {getPublicOrderStatusCardActionLabel(publicOrderStatus)}
        </Button>
      </div>
    </div>
  )
}
