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
    expect(saasBilling.getSaasPlanFromExternalReference(null)).toBeNull()
    expect(saasBilling.getSaasPlanFromExternalReference('saas:tenant:x:plan:enterprise')).toBeNull()
    expect(saasBilling.getTenantIdFromSaasExternalReference(null)).toBeNull()
    expect(saasBilling.getTenantIdFromSaasExternalReference('saas:tenant:bad:plan:pro')).toBeNull()
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

  it('propaga erros nas operações básicas de assinatura SaaS', async () => {
    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        saas_billing_subscriptions: () => ({
          data: null,
          error: new Error('latest failed'),
        }),
      }) as never
    )

    await expect(saasBilling.getLatestSaasBillingSubscription('tenant-1')).rejects.toThrow('latest failed')

    const scheduleClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { id: 'sub-error' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: new Error('schedule failed'),
              }),
            }),
          }),
        }),
      }),
    } as never

    vi.mocked(createAdminClient).mockReturnValue(scheduleClient)

    await expect(
      saasBilling.scheduleSaasPlanChange({
        tenantId: 'tenant-1',
        scheduledPlan: 'pro',
      })
    ).rejects.toThrow('schedule failed')

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        saas_billing_subscriptions: () => ({
          data: null,
          error: new Error('cancel failed'),
        }),
      }) as never
    )

    await expect(
      saasBilling.cancelSaasBillingSubscriptionAtPeriodEnd({
        tenantId: 'tenant-1',
        mercadoPagoPreapprovalId: 'pre-1',
      })
    ).rejects.toThrow('cancel failed')

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        saas_billing_subscriptions: () => ({
          data: null,
          error: new Error('upsert failed'),
        }),
      }) as never
    )

    await expect(
      saasBilling.upsertSaasBillingSubscription({
        tenantId: 'tenant-1',
        plan: 'basic',
        mercadoPagoPreapprovalId: 'pre-1',
        payerEmail: 'owner@test.com',
        externalReference: 'saas:tenant:tenant-1:plan:basic',
        status: 'pending',
      })
    ).rejects.toThrow('upsert failed')
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
      max_users: 2,
      max_tables: 0,
      max_products: 20,
      features: ['orders', 'menu', 'payments', 'team'],
      next_billing_at: null,
    })
    expect(subscriptionUpdate).toHaveProperty('metadata')
    expect(result.downgraded).toBe(true)
  })

  it('ensureTenantBillingAccessState propaga erro ao aplicar downgrade ou atualizar assinatura', async () => {
    vi.setSystemTime(new Date('2026-03-21T12:00:00.000Z'))

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        saas_billing_subscriptions: () => ({
          data: {
            id: 'sub-tenant-error',
            cancel_at_period_end: true,
            next_payment_date: '2026-03-20T12:00:00.000Z',
          },
          error: null,
        }),
        tenants: (state) => {
          if (state.operation === 'update') {
            return { data: null, error: new Error('tenant downgrade failed') }
          }

          return {
            data: { next_billing_at: '2026-03-20T12:00:00.000Z' },
            error: null,
          }
        },
      }) as never
    )

    await expect(saasBilling.ensureTenantBillingAccessState('tenant-1')).rejects.toThrow(
      'tenant downgrade failed'
    )

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-sub-error',
                cancel_at_period_end: true,
                next_payment_date: '2026-03-20T12:00:00.000Z',
              },
              error: null,
            }
          }

          return {
            data: null,
            error: new Error('subscription update failed'),
          }
        },
        tenants: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(saasBilling.ensureTenantBillingAccessState('tenant-1')).rejects.toThrow(
      'subscription update failed'
    )
  })

  it('ensureTenantBillingAccessState usa next_billing_at do tenant quando subscription nao traz data', async () => {
    vi.setSystemTime(new Date('2026-03-21T12:00:00.000Z'))

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: () => ({
          data: {
            id: 'sub-fallback',
            cancel_at_period_end: true,
            next_payment_date: null,
          },
          error: null,
        }),
        tenants: () => ({
          data: { next_billing_at: '2026-03-25T12:00:00.000Z' },
          error: null,
        }),
      }) as never
    )

    await expect(saasBilling.ensureTenantBillingAccessState('tenant-1')).resolves.toEqual({
      downgraded: false,
      subscription: {
        id: 'sub-fallback',
        cancel_at_period_end: true,
        next_payment_date: null,
      },
    })
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
      max_users: 27,
      max_tables: -1,
      max_products: -1,
      features: ['orders', 'menu', 'tables', 'kds', 'stock', 'stock_automation', 'sales', 'payments', 'whatsapp_notifications', 'team', 'reports', 'white_label'],
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

  it('upsertSaasBillingSubscription usa defaults opcionais e sync trata status paused', async () => {
    const updates: Record<string, unknown>[] = []

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-paused',
                tenant_id: 'tenant-1',
                scheduled_plan: null,
              },
              error: null,
            }
          }

          updates.push((state.rows?.[0] ?? state.values) as Record<string, unknown>)
          return {
            data: { id: 'sub-paused', ...(state.rows?.[0] ?? state.values) },
            error: null,
          }
        },
      }) as never
    )

    await expect(
      saasBilling.upsertSaasBillingSubscription({
        tenantId: 'tenant-1',
        plan: 'basic',
        mercadoPagoPreapprovalId: 'pre-defaults',
        payerEmail: 'owner@test.com',
        externalReference: 'saas:tenant:tenant-1:plan:basic',
        status: 'pending',
      })
    ).resolves.toMatchObject({
      id: 'sub-paused',
      checkout_url: null,
      next_payment_date: null,
      metadata: {},
    })

    expect(updates[0]).toMatchObject({
      checkout_url: null,
      next_payment_date: null,
      metadata: {},
    })

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-paused',
        status: 'paused',
        external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      })
    ).resolves.toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'basic',
      status: 'paused',
    })

    expect(updates[2]).toMatchObject({
      cancel_at_period_end: true,
      next_payment_date: null,
    })
  })

  it('syncTenantFromSaasSubscription propaga erro ao atualizar tenant autorizado', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-auth-error',
                scheduled_plan: null,
              },
              error: null,
            }
          }

          return {
            data: { id: 'sub-auth-error' },
            error: null,
          }
        },
        tenants: () => ({
          data: null,
          error: new Error('tenant update failed'),
        }),
      }) as never
    )

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-auth-error',
        status: 'authorized',
        external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      })
    ).rejects.toThrow('tenant update failed')
  })

  it('cobre fallbacks restantes de período e sync autorizado com external reference nulo', async () => {
    vi.setSystemTime(new Date('2026-03-21T12:00:00.000Z'))

    vi.mocked(createAdminClient).mockReset()

    const noSubscriptionAdmin = createMockSupabaseClient({
      saas_billing_subscriptions: () => ({
        data: null,
        error: null,
      }),
    }) as never

    let tenantReads = 0
    let tenantUpdate: Record<string, unknown> | undefined
    const subscriptionUpdates: Record<string, unknown>[] = []

    const fallbackAdmin = createMockSupabaseClient({
      saas_billing_subscriptions: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'sub-fallback-auth',
              cancel_at_period_end: true,
              next_payment_date: null,
              scheduled_plan: 'pro',
            },
            error: null,
          }
        }

        subscriptionUpdates.push((state.rows?.[0] ?? state.values) as Record<string, unknown>)
        return {
          data: { id: 'sub-fallback-auth', ...(state.rows?.[0] ?? state.values) },
          error: null,
        }
      },
      tenants: (state) => {
        if (state.operation === 'select') {
          tenantReads += 1
          return { data: { next_billing_at: null }, error: null }
        }

        tenantUpdate = state.values
        return { data: null, error: null }
      },
    }) as never

    vi.mocked(createAdminClient)
      .mockReturnValueOnce(noSubscriptionAdmin)
      .mockReturnValueOnce(noSubscriptionAdmin)
      .mockReturnValue(fallbackAdmin)

    await expect(saasBilling.ensureTenantBillingAccessState('tenant-1')).resolves.toEqual({
      downgraded: false,
      subscription: null,
    })

    await expect(saasBilling.ensureTenantBillingAccessState('tenant-2')).resolves.toMatchObject({
      downgraded: true,
    })
    expect(tenantReads).toBe(1)

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-fallback-auth',
        status: 'authorized',
        external_reference: null,
        payer_email: null,
        init_point: null,
        next_payment_date: null,
      } as never)
    ).resolves.toEqual({
      synced: false,
      reason: 'missing-reference',
    })

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-fallback-auth',
        status: 'authorized',
        external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
        payer_email: null,
        init_point: null,
        next_payment_date: null,
      })
    ).resolves.toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
      status: 'authorized',
    })

    expect(subscriptionUpdates[1]).toMatchObject({
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      payer_email: '',
      checkout_url: null,
    })
    expect(tenantUpdate).toMatchObject({
      plan: 'pro',
      next_billing_at: null,
      plan_ends_at: null,
    })
    expect(subscriptionUpdates[2]).toMatchObject({
      plan: 'pro',
      scheduled_plan: null,
    })
  })

  it('syncTenantFromSaasSubscription usa fallback de externalReference e limpa scheduled_plan no fluxo autorizado', async () => {
    const subscriptionUpdates: Record<string, unknown>[] = []
    let tenantUpdate: Record<string, unknown> | undefined

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-dynamic-ref',
                scheduled_plan: 'pro',
              },
              error: null,
            }
          }

          subscriptionUpdates.push((state.rows?.[0] ?? state.values) as Record<string, unknown>)
          return {
            data: { id: 'sub-dynamic-ref', ...(state.rows?.[0] ?? state.values) },
            error: null,
          }
        },
        tenants: (state) => {
          tenantUpdate = state.values
          return { data: null, error: null }
        },
      }) as never
    )

    const references = [
      'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      null,
    ]

    const preapproval = {
      id: 'pre-dynamic-ref',
      status: 'authorized',
      payer_email: 'owner@test.com',
      init_point: 'https://checkout.dynamic.test',
      next_payment_date: '2026-04-22T00:00:00.000Z',
      get external_reference() {
        return references.shift() ?? null
      },
    }

    await expect(
      saasBilling.syncTenantFromSaasSubscription(preapproval as never)
    ).resolves.toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
      status: 'authorized',
    })

    expect(subscriptionUpdates[0]).toMatchObject({
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
      status: 'authorized',
    })
    expect(tenantUpdate).toMatchObject({
      plan: 'pro',
      next_billing_at: '2026-04-22T00:00:00.000Z',
      plan_ends_at: null,
    })
    expect(subscriptionUpdates[1]).toMatchObject({
      plan: 'pro',
      scheduled_plan: null,
    })
  })

  it('syncTenantFromSaasSubscription executa cleanup de scheduled_plan com client manual', async () => {
    const updates: Array<{ table: string; values: Record<string, unknown> }> = []

    const manualClient = {
      from(table: string) {
        if (table === 'saas_billing_subscriptions') {
          return {
            select() {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        limit() {
                          return {
                            maybeSingle: async () => ({
                              data: {
                                id: 'sub-manual',
                                scheduled_plan: 'pro',
                              },
                              error: null,
                            }),
                          }
                        },
                      }
                    },
                  }
                },
                single: async () => ({
                  data: {
                    id: 'sub-manual',
                  },
                  error: null,
                }),
              }
            },
            upsert(values: Record<string, unknown>) {
              updates.push({ table, values })
              return {
                select() {
                  return {
                    single: async () => ({
                      data: { id: 'sub-manual' },
                      error: null,
                    }),
                  }
                },
              }
            },
            update(values: Record<string, unknown>) {
              updates.push({ table, values })
              return {
                eq() {
                  return {
                    eq: async () => ({
                      data: null,
                      error: null,
                    }),
                  }
                },
              }
            },
          }
        }

        if (table === 'tenants') {
          return {
            update(values: Record<string, unknown>) {
              updates.push({ table, values })
              return {
                eq: async () => ({
                  data: null,
                  error: null,
                }),
              }
            },
          }
        }

        throw new Error(`unexpected table ${table}`)
      },
    }

    vi.mocked(createAdminClient).mockReturnValue(manualClient as never)

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-manual',
        status: 'authorized',
        external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
        payer_email: 'owner@test.com',
        init_point: 'https://checkout.manual.test',
        next_payment_date: '2026-04-23T00:00:00.000Z',
      })
    ).resolves.toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: 'pro',
      status: 'authorized',
    })

    expect(updates[0]).toMatchObject({
      table: 'saas_billing_subscriptions',
      values: expect.objectContaining({
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        plan: 'pro',
      }),
    })
    expect(updates[1]).toMatchObject({
      table: 'tenants',
      values: expect.objectContaining({
        plan: 'pro',
        next_billing_at: '2026-04-23T00:00:00.000Z',
      }),
    })
    expect(updates[2]).toMatchObject({
      table: 'saas_billing_subscriptions',
      values: {
        plan: 'pro',
        scheduled_plan: null,
      },
    })
  })

  it('syncTenantFromSaasSubscription nao executa cleanup quando scheduled_plan e string vazia', async () => {
    const updates: Array<{ table: string; values: Record<string, unknown> }> = []

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        saas_billing_subscriptions: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                id: 'sub-empty-scheduled',
                scheduled_plan: '',
              },
              error: null,
            }
          }

          updates.push({
            table: 'saas_billing_subscriptions',
            values: (state.rows?.[0] ?? state.values) as Record<string, unknown>,
          })
          return {
            data: { id: 'sub-empty-scheduled' },
            error: null,
          }
        },
        tenants: (state) => {
          updates.push({
            table: 'tenants',
            values: state.values as Record<string, unknown>,
          })
          return { data: null, error: null }
        },
      }) as never
    )

    await expect(
      saasBilling.syncTenantFromSaasSubscription({
        id: 'pre-empty-scheduled',
        status: 'authorized',
        external_reference: 'saas:tenant:123e4567-e89b-12d3-a456-426614174000:plan:basic',
        next_payment_date: '2026-04-24T00:00:00.000Z',
      })
    ).resolves.toEqual({
      synced: true,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      plan: '',
      status: 'authorized',
    })

    expect(updates).toHaveLength(2)
    expect(updates[0]).toMatchObject({
      table: 'saas_billing_subscriptions',
      values: expect.objectContaining({
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        plan: '',
      }),
    })
    expect(updates[1]).toMatchObject({
      table: 'tenants',
      values: expect.objectContaining({
        plan: '',
        next_billing_at: '2026-04-24T00:00:00.000Z',
      }),
    })
  })
})
