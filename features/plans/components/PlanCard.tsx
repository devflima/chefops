import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES, type Plan } from '@/features/plans/types'
import { getPlanCardState, type BillingSubscription } from '@/features/plans/plans-page'

export function PlanCard({
  plan,
  currentPlan,
  currentSubscription,
  loadingPlan,
  onSelect,
}: {
  plan: Plan
  currentPlan?: Plan
  currentSubscription: BillingSubscription
  loadingPlan: Plan | null
  onSelect: (plan: Plan) => void
}) {
  const state = getPlanCardState({ plan, currentPlan, currentSubscription, loadingPlan })

  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 bg-white p-6 ${
        state.isPopular ? 'border-slate-900' : state.isCurrent ? 'border-blue-200' : 'border-slate-200'
      }`}
    >
      {state.badge && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium ${
            state.isPopular ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          {state.badge}
        </span>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{PLAN_LABELS[plan]}</h2>
        <div className="mt-2 flex items-baseline gap-1">
          {PLAN_PRICES[plan] === 0 ? (
            <span className="text-3xl font-bold text-slate-900">Grátis</span>
          ) : (
            <>
              <span className="text-sm text-slate-500">R$</span>
              <span className="text-3xl font-bold text-slate-900">{PLAN_PRICES[plan]}</span>
              <span className="text-sm text-slate-500">/mês</span>
            </>
          )}
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {PLAN_FEATURES[plan].map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant={state.buttonVariant}
        disabled={state.disabled}
        onClick={() => onSelect(plan)}
      >
        {state.buttonLabel}
      </Button>
    </div>
  )
}
