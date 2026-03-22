import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/auth-guards', () => ({
  requireTenantRoles: vi.fn(),
  getCurrentProfile: vi.fn(),
}))

vi.mock('@/lib/tenant-mercadopago', () => ({
  getMercadoPagoOAuthAuthorizeUrl: vi.fn(),
}))

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn(),
  },
}))

const { createClient } = await import('@/lib/supabase/server')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { requireTenantRoles, getCurrentProfile } = await import('@/lib/auth-guards')
const { getMercadoPagoOAuthAuthorizeUrl } = await import('@/lib/tenant-mercadopago')
const crypto = (await import('node:crypto')).default

const loginRoute = await import('@/app/api/auth/login/route')
const registerRoute = await import('@/app/api/auth/register/route')
const mercadoPagoAccountRoute = await import('@/app/api/mercado-pago/account/route')
const mercadoPagoOAuthStartRoute = await import('@/app/api/mercado-pago/oauth/start/route')

describe('api auth and mercado pago routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'
  })

  it('login POST valida body, trata credenciais invalidas e sucesso', async () => {
    const invalid = await loginRoute.POST(
      new Request('https://chefops.test/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalido', password: '' }),
      }) as never
    )
    expect(invalid.status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: new Error('wrong') }),
      },
    } as never)
    const unauthorized = await loginRoute.POST(
      new Request('https://chefops.test/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'chefops@test.com', password: '123456' }),
      }) as never
    )
    expect(unauthorized.status).toBe(401)

    const signInWithPassword = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        signInWithPassword,
      },
    } as never)
    const success = await loginRoute.POST(
      new Request('https://chefops.test/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'chefops@test.com', password: '123456' }),
      }) as never
    )
    expect(success.status).toBe(200)
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'chefops@test.com',
      password: '123456',
    })
  })

  it('register POST valida body, trata slug duplicado, rollback e sucesso', async () => {
    const invalid = await registerRoute.POST(
      new Request('https://chefops.test/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'A',
          email: 'ruim',
          password: '123',
          tenant_name: 'X',
          tenant_slug: 'Slug Invalido',
        }),
      }) as never
    )
    expect(invalid.status).toBe(400)

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505' },
          }),
        })),
      })),
    } as never)

    const conflict = await registerRoute.POST(
      new Request('https://chefops.test/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Maria',
          email: 'maria@test.com',
          password: '123456',
          tenant_name: 'Casa',
          tenant_slug: 'casa',
        }),
      }) as never
    )
    expect(conflict.status).toBe(409)

    const cleanupEq = vi.fn()
    const deleteMock = vi.fn(() => ({ eq: cleanupEq }))
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'tenant-1' },
                error: null,
              }),
            })),
            delete: deleteMock,
          }
        }

        return {}
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ error: new Error('boom') }),
        },
      },
    } as never)

    const rollback = await registerRoute.POST(
      new Request('https://chefops.test/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Maria',
          email: 'maria@test.com',
          password: '123456',
          tenant_name: 'Casa',
          tenant_slug: 'casa',
        }),
      }) as never
    )
    expect(rollback.status).toBe(500)
    expect(cleanupEq).toHaveBeenCalledWith('id', 'tenant-1')

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'tenant-2' },
            error: null,
          }),
        })),
      })),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    } as never)

    const success = await registerRoute.POST(
      new Request('https://chefops.test/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Maria',
          email: 'maria@test.com',
          password: '123456',
          tenant_name: 'Casa',
          tenant_slug: 'casa',
        }),
      }) as never
    )
    expect(success.status).toBe(201)
    expect((await success.json()).data.tenant_slug).toBe('casa')
  })

  it('mercado pago account GET e DELETE tratam auth, erro e sucesso', async () => {
    const forbiddenResponse = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse,
    } as never)
    expect((await mercadoPagoAccountRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { mercado_pago_user_id: 'seller-1' },
          error: null,
        }),
      })),
    } as never)
    const getResponse = await mercadoPagoAccountRoute.GET()
    expect(getResponse.status).toBe(200)
    expect((await getResponse.json()).data.mercado_pago_user_id).toBe('seller-1')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('account failed'),
        }),
      })),
    } as never)
    expect((await mercadoPagoAccountRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    const deleteFailureQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn(() => {
            throw new Error('delete failed')
          }),
        }),
    }
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => deleteFailureQuery),
    } as never)
    const deleteResponse = await mercadoPagoAccountRoute.DELETE()
    expect(deleteResponse.status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    const deleteSuccessQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
    }
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => deleteSuccessQuery),
    } as never)
    const deleteSuccess = await mercadoPagoAccountRoute.DELETE()
    expect(deleteSuccess.status).toBe(200)
  })

  it('mercado pago oauth start redireciona conforme contexto e define cookie quando permitido', async () => {
    vi.mocked(getCurrentProfile).mockResolvedValueOnce({
      user: null,
      profile: null,
    } as never)
    expect((await mercadoPagoOAuthStartRoute.GET()).headers.get('location')).toBe('https://chefops.test/login')

    vi.mocked(getCurrentProfile).mockResolvedValueOnce({
      user: { id: 'user-1' },
      profile: { role: 'manager', tenant_id: 'tenant-1' },
    } as never)
    expect((await mercadoPagoOAuthStartRoute.GET()).headers.get('location')).toBe(
      'https://chefops.test/integracoes?mercado_pago=forbidden'
    )

    vi.mocked(getCurrentProfile).mockResolvedValueOnce({
      user: { id: 'user-1' },
      profile: { role: 'owner', tenant_id: null },
    } as never)
    expect((await mercadoPagoOAuthStartRoute.GET()).headers.get('location')).toBe(
      'https://chefops.test/integracoes?mercado_pago=missing_tenant'
    )

    vi.mocked(crypto.randomUUID).mockReturnValueOnce('state-123')
    vi.mocked(getCurrentProfile).mockResolvedValueOnce({
      user: { id: 'user-1' },
      profile: { role: 'owner', tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(getMercadoPagoOAuthAuthorizeUrl).mockReturnValueOnce('https://mercadopago.test/oauth')

    const allowed = await mercadoPagoOAuthStartRoute.GET()
    expect(allowed.headers.get('location')).toBe('https://mercadopago.test/oauth')
    expect(allowed.headers.get('set-cookie')).toContain('mp_oauth_state=')
    expect(allowed.headers.get('set-cookie')).toContain('tenant_id')
  })
})
