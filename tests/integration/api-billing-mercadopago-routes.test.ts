import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth-guards', () => ({
  requireTenantRoles: vi.fn(),
}))

vi.mock('@/lib/saas-billing', () => ({
  buildSaasExternalReference: vi.fn(),
  buildSaasSubscriptionReason: vi.fn(),
  cancelSaasBillingSubscriptionAtPeriodEnd: vi.fn(),
  ensureTenantBillingAccessState: vi.fn(),
  getBillingPlanAmount: vi.fn(),
  getLatestSaasBillingSubscription: vi.fn(),
  scheduleSaasPlanChange: vi.fn(),
  upsertSaasBillingSubscription: vi.fn(),
}))

vi.mock('@/lib/mercadopago', () => ({
  createSaasSubscriptionLink: vi.fn(),
  updatePreapprovalById: vi.fn(),
}))

vi.mock('@/lib/tenant-mercadopago', () => ({
  exchangeMercadoPagoAuthorizationCode: vi.fn(),
  upsertTenantMercadoPagoAccount: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/checkout-session', () => ({
  createOrderFromCheckoutSession: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

const { requireTenantRoles } = await import('@/lib/auth-guards')
const saasBilling = await import('@/lib/saas-billing')
const mercadoPago = await import('@/lib/mercadopago')
const tenantMercadoPago = await import('@/lib/tenant-mercadopago')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { createOrderFromCheckoutSession } = await import('@/lib/checkout-session')
const { cookies } = await import('next/headers')

const billingSubscriptionRoute = await import('@/app/api/billing/subscription/route')
const mercadoPagoOAuthCallbackRoute = await import('@/app/api/mercado-pago/oauth/callback/route')
const mercadoPagoCheckoutReprocessRoute = await import('@/app/api/mercado-pago/checkout-sessions/[id]/reprocess/route')

describe('api billing and mercado pago routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'
  })

  it('billing subscription GET, DELETE e PATCH cobrem auth, validações e sucesso', async () => {
    const forbiddenResponse = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse,
    } as never)
    expect((await billingSubscriptionRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.ensureTenantBillingAccessState).mockResolvedValueOnce(undefined as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce({
      id: 'sub-1',
      mercado_pago_preapproval_id: 'pre-1',
    } as never)
    const getResponse = await billingSubscriptionRoute.GET()
    expect(getResponse.status).toBe(200)
    expect((await getResponse.json()).data.id).toBe('sub-1')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.ensureTenantBillingAccessState).mockRejectedValueOnce(new Error('billing failed') as never)
    expect((await billingSubscriptionRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce(null as never)
    expect((await billingSubscriptionRoute.DELETE()).status).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce({
      mercado_pago_preapproval_id: 'pre-1',
      next_payment_date: '2026-03-30',
    } as never)
    vi.mocked(mercadoPago.updatePreapprovalById).mockResolvedValueOnce({} as never)
    vi.mocked(saasBilling.cancelSaasBillingSubscriptionAtPeriodEnd).mockResolvedValueOnce({
      id: 'sub-1',
      status: 'cancelled',
    } as never)
    const deleteResponse = await billingSubscriptionRoute.DELETE()
    expect(deleteResponse.status).toBe(200)
    expect((await deleteResponse.json()).data.status).toBe('cancelled')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce({
      mercado_pago_preapproval_id: 'pre-1',
      next_payment_date: '2026-03-30',
    } as never)
    vi.mocked(mercadoPago.updatePreapprovalById).mockRejectedValueOnce(new Error('cancel failed'))
    expect((await billingSubscriptionRoute.DELETE()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce(null as never)
    expect(
      (
        await billingSubscriptionRoute.PATCH(
          new Request('https://chefops.test/api/billing/subscription', {
            method: 'PATCH',
            body: JSON.stringify({ scheduled_plan: 'pro' }),
          }) as never
        )
      ).status
    ).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce({
      mercado_pago_preapproval_id: 'pre-1',
    } as never)
    expect(
      (
        await billingSubscriptionRoute.PATCH(
          new Request('https://chefops.test/api/billing/subscription', {
            method: 'PATCH',
            body: JSON.stringify({ scheduled_plan: 'enterprise' }),
          }) as never
        )
      ).status
    ).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce({
      mercado_pago_preapproval_id: 'pre-1',
    } as never)
    vi.mocked(saasBilling.scheduleSaasPlanChange).mockResolvedValueOnce({
      id: 'sub-1',
      scheduled_plan: 'basic',
    } as never)
    const patchResponse = await billingSubscriptionRoute.PATCH(
      new Request('https://chefops.test/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ scheduled_plan: 'basic' }),
      }) as never
    )
    expect(patchResponse.status).toBe(200)
    expect((await patchResponse.json()).data.scheduled_plan).toBe('basic')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.getLatestSaasBillingSubscription).mockResolvedValueOnce({
      mercado_pago_preapproval_id: 'pre-1',
    } as never)
    vi.mocked(saasBilling.scheduleSaasPlanChange).mockRejectedValueOnce(new Error('schedule failed'))
    expect(
      (
        await billingSubscriptionRoute.PATCH(
          new Request('https://chefops.test/api/billing/subscription', {
            method: 'PATCH',
            body: JSON.stringify({ scheduled_plan: 'pro' }),
          }) as never
        )
      ).status
    ).toBe(500)
  })

  it('billing subscription POST cobre body inválido, email ausente, sucesso e erro inesperado', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    } as never)
    expect(
      (
        await billingSubscriptionRoute.POST(
          new Request('https://chefops.test/api/billing/subscription', {
            method: 'POST',
            body: JSON.stringify({ plan: 'pro' }),
          }) as never
        )
      ).status
    ).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      user: { email: 'owner@test.com' },
      profile: { tenant_id: 'tenant-1' },
    } as never)
    expect(
      (
        await billingSubscriptionRoute.POST(
          new Request('https://chefops.test/api/billing/subscription', {
            method: 'POST',
            body: JSON.stringify({ plan: 'enterprise' }),
          }) as never
        )
      ).status
    ).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      user: { email: null },
      profile: { tenant_id: 'tenant-1' },
    } as never)
    expect(
      (
        await billingSubscriptionRoute.POST(
          new Request('https://chefops.test/api/billing/subscription', {
            method: 'POST',
            body: JSON.stringify({ plan: 'pro' }),
          }) as never
        )
      ).status
    ).toBe(422)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      user: { email: 'owner@test.com' },
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.buildSaasExternalReference).mockReturnValueOnce('tenant-1:pro')
    vi.mocked(saasBilling.buildSaasSubscriptionReason).mockReturnValueOnce('Plano Pro')
    vi.mocked(saasBilling.getBillingPlanAmount).mockReturnValueOnce(149 as never)
    vi.mocked(mercadoPago.createSaasSubscriptionLink).mockResolvedValueOnce({
      id: 'pre-1',
      status: 'pending',
      init_point: 'https://mp.test/checkout',
      next_payment_date: '2026-04-21',
    } as never)
    vi.mocked(saasBilling.upsertSaasBillingSubscription).mockResolvedValueOnce(undefined as never)

    const success = await billingSubscriptionRoute.POST(
      new Request('https://chefops.test/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro' }),
      }) as never
    )
    expect(success.status).toBe(200)
    expect((await success.json()).data.checkout_url).toBe('https://mp.test/checkout')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      user: { email: 'owner@test.com' },
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(saasBilling.buildSaasExternalReference).mockReturnValueOnce('tenant-1:basic')
    vi.mocked(saasBilling.buildSaasSubscriptionReason).mockReturnValueOnce('Plano Basic')
    vi.mocked(saasBilling.getBillingPlanAmount).mockReturnValueOnce(99 as never)
    vi.mocked(mercadoPago.createSaasSubscriptionLink).mockRejectedValueOnce(new Error('boom'))
    expect(
      (
        await billingSubscriptionRoute.POST(
          new Request('https://chefops.test/api/billing/subscription', {
            method: 'POST',
            body: JSON.stringify({ plan: 'basic' }),
          }) as never
        )
      ).status
    ).toBe(500)
  })

  it('oauth callback do mercado pago cobre estado inválido, mismatch, sucesso e erro', async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(undefined),
    } as never)
    const invalid = await mercadoPagoOAuthCallbackRoute.GET(
      new NextRequest('https://chefops.test/api/mercado-pago/oauth/callback?code=abc&state=xyz')
    )
    expect(invalid.headers.get('location')).toContain('mercado_pago=invalid_state')

    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({
        value: JSON.stringify({ state: 'other', tenant_id: 'tenant-1' }),
      }),
    } as never)
    const mismatch = await mercadoPagoOAuthCallbackRoute.GET(
      new NextRequest('https://chefops.test/api/mercado-pago/oauth/callback?code=abc&state=xyz')
    )
    expect(mismatch.headers.get('location')).toContain('mercado_pago=invalid_state')

    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({
        value: JSON.stringify({ state: 'xyz', tenant_id: 'tenant-1' }),
      }),
    } as never)
    vi.mocked(tenantMercadoPago.exchangeMercadoPagoAuthorizationCode).mockResolvedValueOnce({
      access_token: 'token',
    } as never)
    vi.mocked(tenantMercadoPago.upsertTenantMercadoPagoAccount).mockResolvedValueOnce(undefined as never)
    const success = await mercadoPagoOAuthCallbackRoute.GET(
      new NextRequest('https://chefops.test/api/mercado-pago/oauth/callback?code=abc&state=xyz')
    )
    expect(success.headers.get('location')).toContain('mercado_pago=connected')
    expect(success.headers.get('set-cookie')).toContain('mp_oauth_state=')

    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({
        value: JSON.stringify({ state: 'xyz', tenant_id: 'tenant-1' }),
      }),
    } as never)
    vi.mocked(tenantMercadoPago.exchangeMercadoPagoAuthorizationCode).mockRejectedValueOnce(new Error('boom'))
    const failure = await mercadoPagoOAuthCallbackRoute.GET(
      new NextRequest('https://chefops.test/api/mercado-pago/oauth/callback?code=abc&state=xyz')
    )
    expect(failure.headers.get('location')).toContain('mercado_pago=error')
  })

  it('reprocessamento de checkout cobre auth, not found, conflito, já processado, sucesso e erro', async () => {
    const forbiddenResponse = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse,
    } as never)
    expect(
      (
        await mercadoPagoCheckoutReprocessRoute.POST(
          new Request('https://chefops.test/api/mercado-pago/checkout-sessions/session-1/reprocess'),
          { params: Promise.resolve({ id: 'session-1' }) }
        )
      ).status
    ).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
      })),
    } as never)
    expect(
      (
        await mercadoPagoCheckoutReprocessRoute.POST(
          new Request('https://chefops.test/api/mercado-pago/checkout-sessions/session-1/reprocess'),
          { params: Promise.resolve({ id: 'session-1' }) }
        )
      ).status
    ).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-1',
            status: 'converted',
            created_order_id: 'order-1',
          },
          error: null,
        }),
      })),
    } as never)
    const alreadyProcessed = await mercadoPagoCheckoutReprocessRoute.POST(
      new Request('https://chefops.test/api/mercado-pago/checkout-sessions/session-1/reprocess'),
      { params: Promise.resolve({ id: 'session-1' }) }
    )
    expect(alreadyProcessed.status).toBe(200)
    expect((await alreadyProcessed.json()).data.already_processed).toBe(true)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-1',
            status: 'pending',
            mercado_pago_payment_id: null,
            payload: null,
            created_order_id: null,
          },
          error: null,
        }),
      })),
    } as never)
    expect(
      (
        await mercadoPagoCheckoutReprocessRoute.POST(
          new Request('https://chefops.test/api/mercado-pago/checkout-sessions/session-1/reprocess'),
          { params: Promise.resolve({ id: 'session-1' }) }
        )
      ).status
    ).toBe(409)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'session-1',
            status: 'approved',
            mercado_pago_payment_id: 123,
            payload: { any: true },
            created_order_id: null,
          },
          error: null,
        }),
      })),
    } as never)
    vi.mocked(createOrderFromCheckoutSession).mockResolvedValueOnce({
      id: 'order-1',
      order_number: 77,
    } as never)
    const success = await mercadoPagoCheckoutReprocessRoute.POST(
      new Request('https://chefops.test/api/mercado-pago/checkout-sessions/session-1/reprocess'),
      { params: Promise.resolve({ id: 'session-1' }) }
    )
    expect(success.status).toBe(200)
    expect((await success.json()).data.status).toBe('converted')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => {
          throw new Error('boom')
        }),
      })),
    } as never)
    expect(
      (
        await mercadoPagoCheckoutReprocessRoute.POST(
          new Request('https://chefops.test/api/mercado-pago/checkout-sessions/session-1/reprocess'),
          { params: Promise.resolve({ id: 'session-1' }) }
        )
      ).status
    ).toBe(500)
  })
})
