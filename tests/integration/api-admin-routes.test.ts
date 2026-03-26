import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/admin-audit', () => ({
  recordAdminTenantEvent: vi.fn(),
}))

const { createClient } = await import('@/lib/supabase/server')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { recordAdminTenantEvent } = await import('@/lib/admin-audit')

const adminTenantsRoute = await import('@/app/api/admin/tenants/route')
const adminTenantByIdRoute = await import('@/app/api/admin/tenants/[id]/route')
const adminMetricsRoute = await import('@/app/api/admin/metrics/route')
const adminTenantHealthRoute = await import('@/app/api/admin/tenants/[id]/health/route')
const adminTenantHistoryRoute = await import('@/app/api/admin/tenants/[id]/history/route')

describe('api admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin tenants GET cobre acesso negado e sucesso', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await adminTenantsRoute.GET()).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'staff-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: false } }),
      })),
    } as never)
    expect((await adminTenantsRoute.GET()).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [{ id: 'tenant-1' }], error: null }),
      })),
    } as never)
    expect((await adminTenantsRoute.GET()).status).toBe(200)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-2' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('tenants failed') }),
      })),
    } as never)
    expect((await adminTenantsRoute.GET()).status).toBe(500)
  })

  it('admin tenant PATCH cobre validacao e audita alteracoes', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    expect((await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({ plan: 'enterprise' }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(400)

    vi.mocked(recordAdminTenantEvent).mockResolvedValue(undefined as never)
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: {
              id: 'tenant-1',
              name: 'ChefOps',
              plan: 'free',
              status: 'active',
              next_billing_at: '2026-03-24T00:00:00.000Z',
              suspension_reason: null,
            },
            error: null,
          }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'tenant-1' }, error: null }),
        })),
      })),
    } as never)
    expect((await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({
          plan: 'basic',
          status: 'suspended',
          suspension_reason: 'Inadimplência',
          next_billing_at: '2026-04-01T00:00:00.000Z',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(200)
    expect(recordAdminTenantEvent).toHaveBeenCalledTimes(3)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('tenant missing') }),
      })),
    } as never)
    expect((await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(500)

    vi.mocked(recordAdminTenantEvent).mockResolvedValue(undefined as never)
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'tenant-1',
            name: 'ChefOps',
            plan: 'basic',
            status: 'suspended',
            next_billing_at: '2026-04-01T00:00:00.000Z',
            suspension_reason: 'Inadimplência',
          },
          error: null,
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') }),
        })),
      })),
    } as never)
    expect((await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(500)
  })

  it('admin tenant PATCH cobre perfil sem permissao e sucesso sem eventos', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'staff-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: false } }),
      })),
    } as never)
    expect((await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(403)

    vi.mocked(recordAdminTenantEvent).mockResolvedValue(undefined as never)
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'tenant-1',
            name: 'ChefOps',
            plan: 'basic',
            status: 'active',
            next_billing_at: '2026-04-01T00:00:00.000Z',
            suspension_reason: null,
          },
          error: null,
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'tenant-1' }, error: null }),
        })),
      })),
    } as never)

    const response = await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({
          plan: 'basic',
          status: 'active',
          next_billing_at: '2026-04-01T00:00:00.000Z',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )

    expect(response.status).toBe(200)
    expect(recordAdminTenantEvent).not.toHaveBeenCalled()
  })

  it('admin tenant PATCH registra evento ao reativar tenant sem suspensão nova', async () => {
    vi.mocked(recordAdminTenantEvent).mockResolvedValue(undefined as never)
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'tenant-1',
            name: 'ChefOps',
            plan: 'basic',
            status: 'inactive',
            next_billing_at: '2026-04-01T00:00:00.000Z',
            suspension_reason: null,
          },
          error: null,
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'tenant-1', status: 'active' }, error: null }),
        })),
      })),
    } as never)

    const response = await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )

    expect(response.status).toBe(200)
    expect(recordAdminTenantEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        adminUserId: 'admin-1',
        eventType: 'tenant_status_changed',
        message: 'Status alterado de inactive para active.',
        metadata: expect.objectContaining({
          from: 'inactive',
          to: 'active',
          suspension_reason: null,
        }),
      })
    )
  })

  it('admin tenant PATCH usa motivo padrão ao suspender sem suspension_reason', async () => {
    vi.mocked(recordAdminTenantEvent).mockResolvedValue(undefined as never)
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'tenant-1',
            name: 'ChefOps',
            plan: 'basic',
            status: 'active',
            next_billing_at: '2026-04-01T00:00:00.000Z',
            suspension_reason: null,
          },
          error: null,
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'tenant-1', status: 'suspended' }, error: null }),
        })),
      })),
    } as never)

    const response = await adminTenantByIdRoute.PATCH(
      new Request('https://chefops.test/api/admin/tenants/tenant-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' }),
      }) as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )

    expect(response.status).toBe(200)
    expect(recordAdminTenantEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        adminUserId: 'admin-1',
        eventType: 'tenant_suspended',
        message: 'Estabelecimento suspenso. Motivo: Não informado.',
        metadata: expect.objectContaining({
          from: 'active',
          to: 'suspended',
          suspension_reason: null,
        }),
      })
    )
  })

  it('admin metrics GET agrega contagens e receita', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await adminMetricsRoute.GET()).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'staff-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: false } }),
      })),
    } as never)
    expect((await adminMetricsRoute.GET()).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 1 }),
          }
          builder.select = vi.fn().mockImplementation((...args: unknown[]) => {
            if (args[0] === 'plan') return Promise.resolve({ data: [{ plan: 'free' }, { plan: 'pro' }] })
            return builder
          })
          return builder
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ total: 100 }, { total: 50 }] }),
        }
      }),
    } as never)
    expect((await adminMetricsRoute.GET()).status).toBe(200)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: null }),
          }
          builder.select = vi.fn().mockImplementation((...args: unknown[]) => {
            if (args[0] === 'plan') return Promise.resolve({ data: null })
            return builder
          })
          return builder
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    } as never)
    const emptyMetricsResponse = await adminMetricsRoute.GET()
    const emptyMetricsJson = await emptyMetricsResponse.json()
    expect(emptyMetricsResponse.status).toBe(200)
    expect(emptyMetricsJson.data).toEqual({
      total_tenants: 0,
      active_tenants: 0,
      suspended_tenants: 0,
      by_plan: { free: 0, basic: 0, pro: 0 },
      total_revenue: 0,
    })

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        throw new Error('metrics failed')
      }),
    } as never)
    expect((await adminMetricsRoute.GET()).status).toBe(500)
  })

  it('admin tenant health/history GET cobrem sucesso', async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenant_payment_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'connected' } }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: table === 'checkout_sessions'
              ? [{ status: 'converted' }]
              : [{ payment_status: 'paid' }],
          }),
        }
      }),
    } as never)
    expect((await adminTenantHealthRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(200)

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: 'event-1' }], error: null }),
      })),
    } as never)
    expect((await adminTenantHistoryRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(200)
  })

  it('admin tenant health GET cobre acesso negado e erro interno', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await adminTenantHealthRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        throw new Error('health failed')
      }),
    } as never)
    expect((await adminTenantHealthRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(500)
  })

  it('admin tenant health GET cobre perfil sem permissao e listas nulas', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'staff-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: false } }),
      })),
    } as never)
    expect((await adminTenantHealthRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenant_payment_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    } as never)

    const response = await adminTenantHealthRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data).toEqual({
      payment_account: null,
      checkout_summary: {
        pending: 0,
        approved: 0,
        converted: 0,
        rejected: 0,
      },
      order_summary: {
        paid: 0,
        refunded: 0,
        pending: 0,
      },
      recent_checkout_sessions: [],
    })
  })

  it('admin tenant history GET cobre acesso negado e erro interno', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await adminTenantHistoryRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('history failed') }),
      })),
    } as never)

    expect((await adminTenantHistoryRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(500)
  })

  it('admin tenant history GET cobre perfil sem permissao e fallback vazio', async () => {
    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'staff-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: false } }),
      })),
    } as never)
    expect((await adminTenantHistoryRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )).status).toBe(403)

    vi.mocked(createClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      })),
    } as never)

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as never)

    const response = await adminTenantHistoryRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'tenant-1' }) },
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ data: [] })
  })
})
