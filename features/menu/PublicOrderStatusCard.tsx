import { Button } from '@/components/ui/button'
import {
  getPublicOrderStatusCardActionLabel,
  getPublicOrderStatusCardMessage,
  getPublicOrderStatusCardTone,
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
  const tone = getPublicOrderStatusCardTone(publicOrderStatus)
  const toneClasses = {
    warning: {
      container: 'border-amber-200 bg-amber-50',
      title: 'text-amber-900',
      message: 'text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
    progress: {
      container: 'border-sky-200 bg-sky-50',
      title: 'text-sky-900',
      message: 'text-sky-700',
      button: 'bg-sky-600 hover:bg-sky-700',
    },
    delivery: {
      container: 'border-violet-200 bg-violet-50',
      title: 'text-violet-900',
      message: 'text-violet-700',
      button: 'bg-violet-600 hover:bg-violet-700',
    },
    success: {
      container: 'border-emerald-200 bg-emerald-50',
      title: 'text-emerald-900',
      message: 'text-emerald-700',
      button: 'bg-emerald-600 hover:bg-emerald-700',
    },
  }[tone]

  return (
    <div className={`mb-6 rounded-2xl border px-4 py-4 shadow-sm ${toneClasses.container}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${toneClasses.title}`}>
            {getPublicOrderStatusCardTitle(publicOrderStatus)}
          </p>
          <p className={`mt-1 text-sm ${toneClasses.message}`}>
            {getPublicOrderStatusCardMessage(publicOrderStatus)}
          </p>
        </div>
        <Button
          size="sm"
          className={`text-white ${toneClasses.button}`}
          onClick={onTrack}
        >
          {getPublicOrderStatusCardActionLabel(publicOrderStatus)}
        </Button>
      </div>
    </div>
  )
}
