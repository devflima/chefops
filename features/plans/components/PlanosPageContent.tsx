import { Button } from '@/components/ui/button'
import { PlanHelpPanel } from '@/features/plans/components/PlanHelpPanel'
import { PlanCard } from '@/features/plans/components/PlanCard'
import { PlanSubscriptionSummary } from '@/features/plans/components/PlanSubscriptionSummary'
import type { Plan } from '@/features/plans/types'

import { dashboardPlans } from '@/features/plans/plans-page'

type CurrentSubscription = {
  status: string
  plan: 'basic' | 'pro'
  next_payment_date: string | null
  cancel_at_period_end?: boolean
  scheduled_plan?: 'basic' | 'pro' | null
} | null

type Props = {
  currentPlan?: Plan
  currentSubscription: CurrentSubscription
  loadingPlan: Plan | null
  onSelectPlan: (plan: Plan) => void
  onCancelSubscription: () => void
}

export function PlanosPageContent({
  currentPlan,
  currentSubscription,
  loadingPlan,
  onSelectPlan,
  onCancelSubscription,
}: Props) {
  return (
    <div>
      <PlanSubscriptionSummary currentPlan={currentPlan} currentSubscription={currentSubscription} />

      <div className="grid grid-cols-3 gap-6">
        {dashboardPlans.map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            currentPlan={currentPlan}
            currentSubscription={currentSubscription}
            loadingPlan={loadingPlan}
            onSelect={onSelectPlan}
          />
        ))}
      </div>

      {currentSubscription &&
        ['authorized', 'pending'].includes(currentSubscription.status) &&
        !currentSubscription.cancel_at_period_end && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-medium text-amber-900">Cancelar renovação</h3>
            <p className="mt-1 text-sm text-amber-800">
              Ao cancelar, sua assinatura não será renovada e o acesso ao plano atual continua até a próxima cobrança.
            </p>
            <Button variant="outline" className="mt-4" onClick={onCancelSubscription}>
              Cancelar assinatura
            </Button>
          </div>
        )}

      <PlanHelpPanel />
    </div>
  )
}
