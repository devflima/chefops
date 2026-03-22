import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { createClient } = await import('@/lib/supabase/server')
const authGuards = await import('@/lib/auth-guards')

describe('auth guards', () => {
  it('getCurrentProfile retorna contexto sem usuario', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    await expect(authGuards.getCurrentProfile()).resolves.toEqual({
      supabase,
      user: null,
      profile: null,
    })
  })

  it('getCurrentProfile normaliza tenant vindo como array', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'u@test.com' } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-1',
            tenant_id: 'tenant-1',
            role: 'manager',
            full_name: 'Felipe',
            tenants: [{ plan: 'basic', name: 'ChefOps', slug: 'chefops' }],
          },
        }),
      })),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const result = await authGuards.getCurrentProfile()

    expect(result.profile).toEqual({
      id: 'user-1',
      tenant_id: 'tenant-1',
      role: 'manager',
      full_name: 'Felipe',
      tenant: {
        plan: 'basic',
        name: 'ChefOps',
        slug: 'chefops',
      },
    })
  })

  it('requireTenantRoles retorna 401, 404, 403 e ok conforme o contexto', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)
    const unauthorized = await authGuards.requireTenantRoles(['owner'])
    expect(unauthorized.ok).toBe(false)
    expect(unauthorized.response.status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      })),
    } as never)
    const missingProfile = await authGuards.requireTenantRoles(['owner'])
    expect(missingProfile.response.status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-1',
            tenant_id: 'tenant-1',
            role: 'cashier',
            full_name: 'Felipe',
            tenants: { plan: 'basic', name: 'ChefOps', slug: 'chefops' },
          },
        }),
      })),
    } as never)
    const forbidden = await authGuards.requireTenantRoles(['owner'])
    expect(forbidden.response.status).toBe(403)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-1',
            tenant_id: 'tenant-1',
            role: 'owner',
            full_name: 'Felipe',
            tenants: { plan: 'pro', name: 'ChefOps', slug: 'chefops' },
          },
        }),
      })),
    } as never)
    const allowed = await authGuards.requireTenantRoles(['owner'])
    expect(allowed.ok).toBe(true)
  })

  it('requireTenantFeature respeita plano atual', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-1',
            tenant_id: 'tenant-1',
            role: 'owner',
            full_name: 'Felipe',
            tenants: { plan: 'free', name: 'ChefOps', slug: 'chefops' },
          },
        }),
      })),
    } as never)
    const forbidden = await authGuards.requireTenantFeature('reports')
    expect(forbidden.ok).toBe(false)
    expect(forbidden.response.status).toBe(403)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-1',
            tenant_id: 'tenant-1',
            role: 'owner',
            full_name: 'Felipe',
            tenants: { plan: 'pro', name: 'ChefOps', slug: 'chefops' },
          },
        }),
      })),
    } as never)
    const allowed = await authGuards.requireTenantFeature('reports')
    expect(allowed.ok).toBe(true)
  })
})
