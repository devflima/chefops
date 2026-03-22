import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/saas-billing', () => ({
  ensureTenantBillingAccessState: vi.fn().mockResolvedValue({ downgraded: false }),
}))

const { createClient } = await import('@/lib/supabase/server')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { ensureTenantBillingAccessState } = await import('@/lib/saas-billing')
const healthRoute = await import('@/app/api/health/route')
const logoutRoute = await import('@/app/api/auth/logout/route')
const planRoute = await import('@/app/api/plan/route')
const onboardingRoute = await import('@/app/api/onboarding/route')
const publicOrderStatusRoute = await import('@/app/api/public/orders/[id]/status/route')

describe('api core routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('health GET responde ok e 503 em caso de erro', async () => {
    vi.mocked(createClient).mockResolvedValueOnce(
      createMockSupabaseClient({
        tenants: () => ({ data: [{ id: 'tenant-1' }], error: null }),
      }) as never
    )

    const okResponse = await healthRoute.GET()
    expect(okResponse.status).toBe(200)
    expect((await okResponse.json()).status).toBe('ok')

    vi.mocked(createClient).mockRejectedValueOnce(new Error('down'))
    const errorResponse = await healthRoute.GET()
    expect(errorResponse.status).toBe(503)
    expect((await errorResponse.json()).status).toBe('error')
  })

  it('logout POST faz signOut e devolve redirect', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { signOut },
    } as never)

    const response = await logoutRoute.POST()

    expect(signOut).toHaveBeenCalled()
    expect(await response.json()).toEqual({ data: { redirectTo: '/login' } })
  })

  it('plan GET trata 401, 404 e sucesso', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    expect((await planRoute.GET()).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      })),
    } as never)

    expect((await planRoute.GET()).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              plan: 'pro',
              max_users: 0,
              max_tables: 0,
              max_products: 0,
              features: [],
              trial_ends_at: null,
              plan_ends_at: null,
            },
            error: null,
          }),
        }
      }),
    } as never)

    const response = await planRoute.GET()
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(ensureTenantBillingAccessState).toHaveBeenCalledWith('tenant-1')
    expect(json.data.plan).toBe('pro')
    expect(json.data.available_roles).toContain('owner')

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('tenant failed'),
          }),
        }
      }),
    } as never)

    expect((await planRoute.GET()).status).toBe(500)
  })

  it('onboarding GET e PATCH cobrem autorização, perfil e completed_at', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await onboardingRoute.GET()).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-1', has_category: false },
            error: null,
          }),
        }
      }),
    } as never)

    expect((await onboardingRoute.GET()).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    } as never)
    expect((await onboardingRoute.GET()).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('select failed') }),
        }
      }),
    } as never)
    expect((await onboardingRoute.GET()).status).toBe(500)

    let updatedValues: Record<string, unknown> | undefined
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
          }
        }

        return {
          update: vi.fn((value) => {
            updatedValues = value
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'step-1', ...value },
                error: null,
              }),
            }
          }),
        }
      }),
    } as never)

    const patchResponse = await onboardingRoute.PATCH(
      new Request('https://chefops.test/api/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          has_category: true,
          has_product: true,
          has_menu_item: true,
          has_table: true,
        }),
      }) as never
    )

    expect(patchResponse.status).toBe(200)
    expect(updatedValues).toHaveProperty('completed_at')

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
          }
        }

        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    } as never)
    expect((await onboardingRoute.PATCH(
      new Request('https://chefops.test/api/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ has_category: true }),
      }) as never
    )).status).toBe(404)

    let patchWithoutCompletedAt: Record<string, unknown> | undefined
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
          }
        }

        return {
          update: vi.fn((value) => {
            patchWithoutCompletedAt = value
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'step-1', ...value }, error: null }),
            }
          }),
        }
      }),
    } as never)
    expect((await onboardingRoute.PATCH(
      new Request('https://chefops.test/api/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ has_category: true, has_product: false }),
      }) as never
    )).status).toBe(200)
    expect(patchWithoutCompletedAt).not.toHaveProperty('completed_at')

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
          }
        }

        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') }),
          })),
        }
      }),
    } as never)
    expect((await onboardingRoute.PATCH(
      new Request('https://chefops.test/api/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ has_category: true }),
      }) as never
    )).status).toBe(500)
  })

  it('public order status GET retorna 404 e sucesso', async () => {
    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        orders: () => ({ data: null, error: new Error('missing') }),
      }) as never
    )

    expect(
      (
        await publicOrderStatusRoute.GET({} as Request, { params: Promise.resolve({ id: 'order-1' }) })
      ).status
    ).toBe(404)

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        orders: () => ({
          data: { id: 'order-1', status: 'pending' },
          error: null,
        }),
      }) as never
    )

    const response = await publicOrderStatusRoute.GET(
      {} as Request,
      { params: Promise.resolve({ id: 'order-1' }) }
    )

    expect(response.status).toBe(200)
    expect((await response.json()).data.id).toBe('order-1')
  })
})
