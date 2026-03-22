import { PLAN_LABELS, PLAN_PRICES, type Plan } from '@/features/plans/types'

export type BillingSubscription = {
  status: string
  plan: 'basic' | 'pro'
  next_payment_date: string | null
  cancel_at_period_end?: boolean
  scheduled_plan?: 'basic' | 'pro' | null
} | null

export const dashboardPlans: Plan[] = ['free', 'basic', 'pro']

export function isPaidSubscriptionActive(subscription: BillingSubscription) {
  return !!subscription && ['authorized', 'pending'].includes(subscription.status)
}

export function formatPlanDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('pt-BR')
}

export function getSubscriptionSummary(subscription: BillingSubscription) {
  if (!subscription) return null

  const base = `Assinatura atual: ${PLAN_LABELS[subscription.plan]} · status ${subscription.status}`
  const nextPayment = formatPlanDate(subscription.next_payment_date)

  return nextPayment ? `${base} · próxima cobrança em ${nextPayment}` : base
}

export function getCancellationSummary(subscription: BillingSubscription) {
  if (!subscription?.cancel_at_period_end || !subscription.next_payment_date) return null

  return `Renovação cancelada. O acesso continua até ${formatPlanDate(subscription.next_payment_date)}.`
}

export function getScheduledPlanSummary(subscription: BillingSubscription) {
  if (!subscription?.scheduled_plan || !subscription.next_payment_date) return null

  return `Mudança programada para ${PLAN_LABELS[subscription.scheduled_plan]} em ${formatPlanDate(subscription.next_payment_date)}.`
}

export function getPlanCardState({
  plan,
  currentPlan,
  currentSubscription,
  loadingPlan,
}: {
  plan: Plan
  currentPlan?: Plan
  currentSubscription: BillingSubscription
  loadingPlan: Plan | null
}) {
  const isCurrent = currentPlan === plan
  const isPopular = plan === 'basic'
  const hasPaidSubscription = isPaidSubscriptionActive(currentSubscription)

  if (isCurrent) {
    return {
      isCurrent,
      isPopular,
      badge: isPopular ? 'Mais popular' : 'Plano atual',
      buttonLabel: 'Plano atual',
      buttonVariant: 'outline' as const,
      disabled: true,
    }
  }

  if (plan === 'free') {
    return {
      isCurrent,
      isPopular,
      badge: isPopular ? 'Mais popular' : null,
      buttonLabel: 'Usar Basic',
      buttonVariant: 'outline' as const,
      disabled: false,
    }
  }

  return {
    isCurrent,
    isPopular,
    badge: isPopular ? 'Mais popular' : null,
    buttonLabel:
      loadingPlan === plan
        ? 'Redirecionando...'
        : hasPaidSubscription
          ? 'Trocar no próximo ciclo'
          : 'Assinar agora',
    buttonVariant: isPopular ? ('default' as const) : ('outline' as const),
    disabled: loadingPlan === plan,
  }
}

export function getPlanPriceLabel(plan: Plan) {
  if (PLAN_PRICES[plan] === 0) return 'Grátis'
  return `R$ ${PLAN_PRICES[plan]}/mês`
}

export function getBillingReturnAlertMessage(searchParams: { get: (key: string) => string | null }) {
  if (searchParams.get('billing') !== 'return') return null
  return 'Retorno da assinatura recebido. Assim que o Mercado Pago confirmar, o plano será atualizado automaticamente.'
}

export async function createPlanSubscription(
  plan: 'basic' | 'pro',
  fetchImpl: typeof fetch = fetch
) {
  const res = await fetchImpl('/api/billing/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  })
  const json = await res.json()

  if (!res.ok) throw new Error(json.error)
  if (!json.data?.checkout_url) {
    throw new Error('O Mercado Pago não retornou um link de assinatura.')
  }

  return json.data.checkout_url as string
}

export async function cancelPlanSubscription(
  fetchImpl: typeof fetch = fetch
) {
  const res = await fetchImpl('/api/billing/subscription', { method: 'DELETE' })
  const json = await res.json()

  if (!res.ok) throw new Error(json.error)

  return {
    subscription: json.data as NonNullable<BillingSubscription>,
    message: 'Renovação cancelada com sucesso. Seu plano continuará ativo até o vencimento atual.',
  }
}

export async function schedulePlanSubscriptionChange(
  plan: 'basic' | 'pro',
  fetchImpl: typeof fetch = fetch
) {
  const res = await fetchImpl('/api/billing/subscription', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_plan: plan }),
  })
  const json = await res.json()

  if (!res.ok) throw new Error(json.error)

  return {
    subscription: json.data as NonNullable<BillingSubscription>,
    message: `Mudança programada com sucesso. O plano ${PLAN_LABELS[plan]} entra na próxima renovação.`,
  }
}
