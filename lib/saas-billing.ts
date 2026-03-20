import { PLAN_LABELS, PLAN_PRICES, type Plan } from '@/features/plans/types'
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

  await upsertSaasBillingSubscription({
    tenantId,
    plan,
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
        plan,
        next_billing_at: preapproval.next_payment_date ?? null,
        plan_ends_at: null,
      })
      .eq('id', tenantId)

    if (error) throw error
    return { synced: true as const, tenantId, plan, status: preapproval.status }
  }

  if (['cancelled', 'paused'].includes(preapproval.status)) {
    const { error } = await admin
      .from('tenants')
      .update({
        plan: 'free',
        next_billing_at: null,
        plan_ends_at: new Date().toISOString(),
      })
      .eq('id', tenantId)

    if (error) throw error
    return { synced: true as const, tenantId, plan: 'free', status: preapproval.status }
  }

  return { synced: true as const, tenantId, plan, status: preapproval.status }
}
