import { requireTenantRoles } from '@/lib/auth-guards'
import {
  buildSaasExternalReference,
  buildSaasSubscriptionReason,
  cancelSaasBillingSubscriptionAtPeriodEnd,
  ensureTenantBillingAccessState,
  getBillingPlanAmount,
  getLatestSaasBillingSubscription,
  scheduleSaasPlanChange,
  type BillingPlan,
  upsertSaasBillingSubscription,
} from '@/lib/saas-billing'
import { MercadoPagoApiError, createSaasSubscriptionLink, updatePreapprovalById } from '@/lib/mercadopago'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  plan: z.enum(['basic', 'pro']),
})

const scheduleSchema = z.object({
  scheduled_plan: z.enum(['basic', 'pro']),
})

export async function GET() {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response

    await ensureTenantBillingAccessState(auth.profile.tenant_id)
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

export async function DELETE() {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response
    const { profile } = auth

    const subscription = await getLatestSaasBillingSubscription(profile.tenant_id)
    if (!subscription?.mercado_pago_preapproval_id) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada para cancelamento.' },
        { status: 404 }
      )
    }

    await updatePreapprovalById({
      preapprovalId: subscription.mercado_pago_preapproval_id,
      body: { status: 'cancelled' },
    })

    const updated = await cancelSaasBillingSubscriptionAtPeriodEnd({
      tenantId: profile.tenant_id,
      mercadoPagoPreapprovalId: subscription.mercado_pago_preapproval_id,
      nextPaymentDate: subscription.next_payment_date ?? null,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[billing-subscription:delete]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cancelar assinatura.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireTenantRoles(['owner'])
    if (!auth.ok) return auth.response
    const { profile } = auth

    const currentSubscription = await getLatestSaasBillingSubscription(profile.tenant_id)
    if (!currentSubscription?.mercado_pago_preapproval_id) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura encontrada para programar a troca de plano.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = scheduleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await scheduleSaasPlanChange({
      tenantId: profile.tenant_id,
      scheduledPlan: parsed.data.scheduled_plan,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[billing-subscription:patch]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao programar troca de plano.' },
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

    if (
      error instanceof MercadoPagoApiError &&
      error.message.includes('Both payer and collector must be real or test users')
    ) {
      return NextResponse.json(
        {
          error:
            'A assinatura não pôde ser iniciada porque o ambiente do Mercado Pago está misturando usuários de teste e produção. Revise as credenciais atuais ou conclua a assinatura com um usuário compatível com esse modo.',
        },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao iniciar assinatura.' },
      { status: 500 }
    )
  }
}
