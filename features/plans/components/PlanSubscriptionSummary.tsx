import { PLAN_LABELS, type Plan } from '@/features/plans/types'
import {
  getCancellationSummary,
  getScheduledPlanSummary,
  getSubscriptionSummary,
  type BillingSubscription,
} from '@/features/plans/plans-page'

export function PlanSubscriptionSummary({
  currentPlan,
  currentSubscription,
}: {
  currentPlan?: Plan
  currentSubscription: BillingSubscription
}) {
  const summary = getSubscriptionSummary(currentSubscription)
  const cancellationSummary = getCancellationSummary(currentSubscription)
  const scheduledSummary = getScheduledPlanSummary(currentSubscription)

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-slate-900">Planos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Seu plano atual: <span className="font-medium text-slate-900">{PLAN_LABELS[currentPlan ?? 'free']}</span>
      </p>
      {summary && (
        <p className="mt-2 text-sm text-slate-500">
          Assinatura atual:{' '}
          <span className="font-medium text-slate-900">{PLAN_LABELS[currentSubscription!.plan]}</span> · status{' '}
          <span className="font-medium capitalize text-slate-900">{currentSubscription!.status}</span>
          {summary.includes('próxima cobrança em') && (
            <>
              {' '}· próxima cobrança em{' '}
              <span className="font-medium text-slate-900">
                {summary.split('próxima cobrança em ')[1]}
              </span>
            </>
          )}
        </p>
      )}
      {cancellationSummary && <p className="mt-2 text-sm text-amber-700">{cancellationSummary}</p>}
      {scheduledSummary && <p className="mt-2 text-sm text-blue-700">{scheduledSummary}</p>}
    </div>
  )
}
