import { PLAN_LABELS, PLAN_PRICES, type Plan } from '@/features/plans/types'
import { getPersistedTenantPlanSnapshot } from '@/lib/tenant-plan'
import { createAdminClient } from '@/lib/supabase/admin'

export type BillingPlan = Extract<Plan, 'basic' | 'pro'>

type MercadoPagoPreapproval = {
  id: string
  init_point?: string | null
  status: string
  reason?: string | null
  external_reference?: string | null
  payer_email?: string | null
  next_payment_date?: string | null
  date_created?: string | null
  last_modified?: string | null
}

function hasBillingPeriodEnded(nextBillingAt?: string | null) {
  if (!nextBillingAt) return true
  return new Date(nextBillingAt).getTime() <= Date.now()
}

export function getBillingPlanAmount(plan: BillingPlan) {
  return PLAN_PRICES[plan]
}

export function buildSaasExternalReference(params: { tenantId: string; plan: BillingPlan }) {
  return `saas:tenant:${params.tenantId}:plan:${params.plan}`
}

export function getSaasPlanFromExternalReference(reference?: string | null) {
  if (!reference) return null
  const match = reference.match(/plan:(basic|pro)/i)
  return (match?.[1] as BillingPlan | undefined) ?? null
}

export function getTenantIdFromSaasExternalReference(reference?: string | null) {
  if (!reference) return null
  const match = reference.match(/tenant:([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

export function buildSaasSubscriptionReason(plan: BillingPlan) {
  return `ChefOps ${PLAN_LABELS[plan]}`
}

export async function getLatestSaasBillingSubscription(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('saas_billing_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function scheduleSaasPlanChange(params: {
  tenantId: string
  scheduledPlan: BillingPlan
}) {
  const admin = createAdminClient()
  const latest = await getLatestSaasBillingSubscription(params.tenantId)

  if (!latest?.id) {
    throw new Error('Assinatura atual não encontrada para programar a troca de plano.')
  }

  const { data, error } = await admin
    .from('saas_billing_subscriptions')
    .update({
      scheduled_plan: params.scheduledPlan,
    })
    .eq('id', latest.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelSaasBillingSubscriptionAtPeriodEnd(params: {
  tenantId: string
  mercadoPagoPreapprovalId: string
  nextPaymentDate?: string | null
}) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('saas_billing_subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
      next_payment_date: params.nextPaymentDate ?? null,
    })
    .eq('tenant_id', params.tenantId)
    .eq('mercado_pago_preapproval_id', params.mercadoPagoPreapprovalId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function ensureTenantBillingAccessState(tenantId: string) {
  const admin = createAdminClient()
  const subscription = await getLatestSaasBillingSubscription(tenantId)

  if (!subscription?.cancel_at_period_end) {
    return { downgraded: false as const, subscription }
  }

  const effectiveEnd =
    subscription.next_payment_date ??
    (await admin
      .from('tenants')
      .select('next_billing_at')
      .eq('id', tenantId)
      .single()).data?.next_billing_at ??
    null

  if (!hasBillingPeriodEnded(effectiveEnd)) {
    return { downgraded: false as const, subscription }
  }

  const { error: tenantError } = await admin
    .from('tenants')
    .update({
      ...getPersistedTenantPlanSnapshot('free'),
      next_billing_at: null,
      plan_ends_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (tenantError) throw tenantError

  const { data: updatedSubscription, error: subError } = await admin
    .from('saas_billing_subscriptions')
    .update({
      metadata: {
        downgrade_applied_at: new Date().toISOString(),
      },
    })
    .eq('id', subscription.id)
    .select()
    .single()

  if (subError) throw subError

  return { downgraded: true as const, subscription: updatedSubscription }
}

export async function upsertSaasBillingSubscription(params: {
  tenantId: string
  plan: BillingPlan
  mercadoPagoPreapprovalId: string
  payerEmail: string
  externalReference: string
  checkoutUrl?: string | null
  status: string
  nextPaymentDate?: string | null
  metadata?: Record<string, unknown>
}) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('saas_billing_subscriptions')
    .upsert(
      {
        tenant_id: params.tenantId,
        plan: params.plan,
        mercado_pago_preapproval_id: params.mercadoPagoPreapprovalId,
        payer_email: params.payerEmail,
        external_reference: params.externalReference,
        checkout_url: params.checkoutUrl ?? null,
        status: params.status,
        next_payment_date: params.nextPaymentDate ?? null,
        metadata: params.metadata ?? {},
      },
      { onConflict: 'mercado_pago_preapproval_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function syncTenantFromSaasSubscription(preapproval: MercadoPagoPreapproval) {
  const tenantId = getTenantIdFromSaasExternalReference(preapproval.external_reference)
  const plan = getSaasPlanFromExternalReference(preapproval.external_reference)

  if (!tenantId || !plan) {
    return { synced: false as const, reason: 'missing-reference' as const }
  }

  const admin = createAdminClient()

  const existing = await getLatestSaasBillingSubscription(tenantId)
  const effectivePlan = (existing?.scheduled_plan as BillingPlan | null) ?? plan

  await upsertSaasBillingSubscription({
    tenantId,
    plan: effectivePlan,
    mercadoPagoPreapprovalId: preapproval.id,
    payerEmail: preapproval.payer_email ?? '',
    externalReference: preapproval.external_reference ?? buildSaasExternalReference({ tenantId, plan }),
    checkoutUrl: preapproval.init_point ?? null,
    status: preapproval.status,
    nextPaymentDate: preapproval.next_payment_date ?? null,
    metadata: {
      reason: preapproval.reason ?? null,
      last_modified: preapproval.last_modified ?? null,
      date_created: preapproval.date_created ?? null,
    },
  })

  if (preapproval.status === 'authorized') {
    const { error } = await admin
      .from('tenants')
      .update({
        ...getPersistedTenantPlanSnapshot(effectivePlan),
        next_billing_at: preapproval.next_payment_date ?? null,
        plan_ends_at: null,
      })
      .eq('id', tenantId)

    if (error) throw error

    if (existing?.scheduled_plan) {
      await admin
        .from('saas_billing_subscriptions')
        .update({
          plan: effectivePlan,
          scheduled_plan: null,
        })
        .eq('tenant_id', tenantId)
        .eq('mercado_pago_preapproval_id', preapproval.id)
    }

    return { synced: true as const, tenantId, plan: effectivePlan, status: preapproval.status }
  }

  if (['cancelled', 'paused'].includes(preapproval.status)) {
    await admin
      .from('saas_billing_subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        next_payment_date: preapproval.next_payment_date ?? null,
      })
      .eq('mercado_pago_preapproval_id', preapproval.id)

    return { synced: true as const, tenantId, plan, status: preapproval.status }
  }

  return { synced: true as const, tenantId, plan, status: preapproval.status }
}
