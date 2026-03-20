import { requireTenantRoles } from '@/lib/auth-guards'
import {
  buildSaasExternalReference,
  buildSaasSubscriptionReason,
  getBillingPlanAmount,
  getLatestSaasBillingSubscription,
  type BillingPlan,
  upsertSaasBillingSubscription,
} from '@/lib/saas-billing'
import { createSaasSubscriptionLink } from '@/lib/mercadopago'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  plan: z.enum(['basic', 'pro']),
})

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response

    const subscription = await getLatestSaasBillingSubscription(auth.profile.tenant_id)
    return NextResponse.json({ data: subscription })
  } catch (error) {
    console.error('[billing-subscription:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar assinatura atual.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response
    const { user, profile } = auth

    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const targetPlan = parsed.data.plan as BillingPlan
    const payerEmail = user.email ?? ''

    if (!payerEmail) {
      return NextResponse.json(
        { error: 'Não foi possível identificar o e-mail do responsável pelo estabelecimento.' },
        { status: 422 }
      )
    }

    const externalReference = buildSaasExternalReference({
      tenantId: profile.tenant_id,
      plan: targetPlan,
    })

    const backUrl = `${process.env.NEXT_PUBLIC_APP_URL}/planos?billing=return`
    const subscription = await createSaasSubscriptionLink({
      reason: buildSaasSubscriptionReason(targetPlan),
      payerEmail,
      externalReference,
      amount: getBillingPlanAmount(targetPlan),
      backUrl,
    })

    await upsertSaasBillingSubscription({
      tenantId: profile.tenant_id,
      plan: targetPlan,
      mercadoPagoPreapprovalId: subscription.id,
      payerEmail,
      externalReference,
      checkoutUrl: subscription.init_point ?? null,
      status: subscription.status,
      nextPaymentDate: subscription.next_payment_date ?? null,
      metadata: {
        source: 'plan-page',
      },
    })

    return NextResponse.json({
      data: {
        id: subscription.id,
        status: subscription.status,
        checkout_url: subscription.init_point ?? null,
      },
    })
  } catch (error) {
    console.error('[billing-subscription:post]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao iniciar assinatura.' },
      { status: 500 }
    )
  }
}
