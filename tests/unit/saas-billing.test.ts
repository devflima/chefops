import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const saasBilling = await import('@/lib/saas-billing')

describe('saas billing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolve helpers de plano e external reference', () => {
    expect(saasBilling.getBillingPlanAmount('basic')).toBe(89)
    expect(saasBilling.buildSaasExternalReference({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
    })).toBe('saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:pro')
    expect(saasBilling.getSaasPlanFromExternalReference('saas:tenant:x:plan:basic')).toBe('basic')
    expect(
      saasBilling.getTenantIdFromSaasExternalReference('saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:pro')
    ).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(saasBilling.buildSaasSubscriptionReason('pro')).toBe('ChefOps Premium')
  })

  it('scheduleSaasPlanChange falha sem assinatura atual', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(
      saasBilling.scheduleSaasPlanChange({
        tenantId: 'tenant-1',
        scheduledPlan: 'pro',
      })
    ).rejects.toThrow(/Assinatura atual não encontrada/)
  })

  it('ensureTenantBillingAccessState nao faz downgrade antes do fim do periodo', async () => {
    vi.setSystemTime(new Date('2026-03-21T12:00:00.000Z'))

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: () => ({
          data: {
            id: 'sub-1',
            cancel_at_period_end: true,
            next_payment_date: '2026-03-25T12:00:00.000Z',
          },
          error: null,
        }),
      }) as never
    )

    const result = await saasBilling.ensureTenantBillingAccessState('tenant-1')

    expect(result).toEqual({
      downgraded: false,
      subscription: {
        id: 'sub-1',
        cancel_at_period_end: true,
        next_payment_date: '2026-03-25T12:00:00.000Z',
      },
    })
  })

  it('ensureTenantBillingAccessState aplica downgrade apos fim do periodo', async () => {
    vi.setSystemTime(new Date('2026-03-21T12:00:00.000Z'))
    let tenantUpdate: Record<string, unknown> | undefined
    let subscriptionUpdate: Record<string, unknown> | undefined

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-1',
                cancel_at_period_end: true,
                next_payment_date: '2026-03-20T12:00:00.000Z',
              },
              error: null,
            }
          }

          subscriptionUpdate = state.values
          return {
            data: {
              id: 'sub-1',
              metadata: subscriptionUpdate,
            },
            error: null,
          }
        },
        tenants: (state) => {
          if (state.operation === 'update') {
            tenantUpdate = state.values
            return { data: null, error: null }
          }

          return {
            data: { next_billing_at: '2026-03-20T12:00:00.000Z' },
            error: null,
          }
        },
      }) as never
    )

    const result = await saasBilling.ensureTenantBillingAccessState('tenant-1')

    expect(tenantUpdate).toMatchObject({
      plan: 'free',
      next_billing_at: null,
    })
    expect(subscriptionUpdate).toHaveProperty('metadata')
    expect(result.downgraded).toBe(true)
  })

  it('syncTenantFromSaasSubscription trata reference ausente', async () => {
    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-1',
        status: 'authorized',
      })
    ).resolves.toEqual({
      synced: false,
      reason: 'missing-reference',
    })
  })

  it('syncTenantFromSaasSubscription autoriza plano efetivo e limpa scheduled plan', async () => {
    let tenantUpdate: Record<string, unknown> | undefined
    const subscriptionUpdates: Record<string, unknown>[] = []

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-1',
                scheduled_plan: 'pro',
              },
              error: null,
            }
          }

          subscriptionUpdates.push((state.rows?.[0] ?? state.values) as Record<string, unknown>)
          return {
            data: { id: 'sub-1' },
            error: null,
          }
        },
        tenants: (state) => {
          tenantUpdate = state.values
          return { data: null, error: null }
        },
      }) as never
    )

    const result = await saasBilling.syncTenantFromSaasSubscription({
      id: 'pre-1',
      status: 'authorized',
      external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      payer_email: 'owner@test.com',
      next_payment_date: '2026-04-21T00:00:00.000Z',
      init_point: 'https://checkout.test',
    })

    expect(subscriptionUpdates[0]).toMatchObject({
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
      mercado_pago_preapproval_id: 'pre-1',
      payer_email: 'owner@test.com',
      status: 'authorized',
    })
    expect(tenantUpdate).toMatchObject({
      plan: 'pro',
      next_billing_at: '2026-04-21T00:00:00.000Z',
      plan_ends_at: null,
    })
    expect(result).toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
      status: 'authorized',
    })
  })

  it('cobre latest subscription, cancelamento no fim do período e ausência de downgrade', async () => {
    let subscriptionUpdate: Record<string, unknown> | undefined

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-2',
                tenant_id: 'tenant-1',
                cancel_at_period_end: false,
              },
              error: null,
            }
          }

          subscriptionUpdate = state.values
          return {
            data: { id: 'sub-2', ...state.values },
            error: null,
          }
        },
      }) as never
    )

    await expect(saasBilling.getLatestSaasBillingSubscription('tenant-1')).resolves.toMatchObject({
      id: 'sub-2',
      tenant_id: 'tenant-1',
    })

    await expect(
      saasBilling.cancelSaasBillingSubscriptionAtPeriodEnd({
        tenantId: 'tenant-1',
        mercadoPagoPreapprovalId: 'pre-2',
        nextPaymentDate: '2026-04-01T00:00:00.000Z',
      })
    ).resolves.toMatchObject({
      id: 'sub-2',
      status: 'cancelled',
    })

    expect(subscriptionUpdate).toMatchObject({
      status: 'cancelled',
      cancel_at_period_end: true,
      next_payment_date: '2026-04-01T00:00:00.000Z',
    })

    await expect(saasBilling.ensureTenantBillingAccessState('tenant-1')).resolves.toEqual({
      downgraded: false,
      subscription: {
        id: 'sub-2',
        tenant_id: 'tenant-1',
        cancel_at_period_end: false,
      },
    })
  })

  it('scheduleSaasPlanChange e syncTenantFromSaasSubscription cobrem branches restantes', async () => {
    const updates: Record<string, unknown>[] = []

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-3',
                tenant_id: 'tenant-1',
                scheduled_plan: null,
              },
              error: null,
            }
          }

          updates.push((state.rows?.[0] ?? state.values) as Record<string, unknown>)
          return {
            data: { id: 'sub-3', ...(state.rows?.[0] ?? state.values) },
            error: null,
          }
        },
        tenants: () => ({ data: null, error: null }),
      }) as never
    )

    await expect(
      saasBilling.scheduleSaasPlanChange({
        tenantId: 'tenant-1',
        scheduledPlan: 'basic',
      })
    ).resolves.toMatchObject({
      id: 'sub-3',
      scheduled_plan: 'basic',
    })

    expect(updates[0]).toMatchObject({
      scheduled_plan: 'basic',
    })

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-3',
        status: 'cancelled',
        external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:pro',
        next_payment_date: '2026-04-10T00:00:00.000Z',
      })
    ).resolves.toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
      status: 'cancelled',
    })

    expect(updates[1]).toMatchObject({
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'cancelled',
    })
    expect(updates[2]).toMatchObject({
      cancel_at_period_end: true,
      next_payment_date: '2026-04-10T00:00:00.000Z',
    })

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-4',
        status: 'pending',
        external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      })
    ).resolves.toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'basic',
      status: 'pending',
    })
  })
})
