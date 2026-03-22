import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/crypto', () => ({
  encryptSecret: vi.fn((value: string) => `enc:${value}`),
  decryptSecret: vi.fn((value: string) => value.replace(/^enc:/, '')),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const { decryptSecret, encryptSecret } = await import('@/lib/crypto')
const tenantMercadoPago = await import('@/lib/tenant-mercadopago')

describe('tenant mercado pago', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'
    process.env.MERCADO_PAGO_CLIENT_ID = 'client-id'
    process.env.MERCADO_PAGO_CLIENT_SECRET = 'client-secret'
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'fallback-token'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.MERCADO_PAGO_CLIENT_ID
    delete process.env.MERCADO_PAGO_CLIENT_SECRET
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    delete process.env.MERCADO_PAGO_OAUTH_REDIRECT_URI
  })

  it('monta redirect uri e authorize url do OAuth', () => {
    process.env.MERCADO_PAGO_OAUTH_REDIRECT_URI = 'https://custom.test/callback'

    expect(tenantMercadoPago.getMercadoPagoOAuthRedirectUri()).toBe('https://custom.test/callback')

    const url = tenantMercadoPago.getMercadoPagoOAuthAuthorizeUrl('state-123')

    expect(url).toContain('https://auth.mercadopago.com.br/authorization?')
    expect(url).toContain('client_id=client-id')
    expect(url).toContain('state=state-123')
    expect(url).toContain(encodeURIComponent('https://custom.test/callback'))
  })

  it('exchangeMercadoPagoAuthorizationCode envia payload esperado', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access',
          refresh_token: 'refresh',
          user_id: 123,
          expires_in: 3600,
        }),
        { status: 200 }
      )
    )

    const result = await tenantMercadoPago.exchangeMercadoPagoAuthorizationCode('code-123')

    expect(result.access_token).toBe('access')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      client_id: 'client-id',
      client_secret: 'client-secret',
      grant_type: 'authorization_code',
      code: 'code-123',
      redirect_uri: 'https://chefops.test/api/mercado-pago/oauth/callback',
    })
  })

  it('refreshMercadoPagoAccessToken envia payload esperado e falha sem env obrigatória', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-refresh',
          refresh_token: 'refresh-next',
          user_id: 123,
          expires_in: 3600,
        }),
        { status: 200 }
      )
    )

    const result = await tenantMercadoPago.refreshMercadoPagoAccessToken('refresh-123')

    expect(result.access_token).toBe('access-refresh')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-123',
    })

    delete process.env.MERCADO_PAGO_CLIENT_ID
    expect(() => tenantMercadoPago.getMercadoPagoOAuthAuthorizeUrl('state-1')).toThrow(
      /Missing Mercado Pago OAuth env: MERCADO_PAGO_CLIENT_ID/
    )
  })

  it('upsertTenantMercadoPagoAccount persiste conta com tokens criptografados', async () => {
    let upsertRow: Record<string, unknown> | undefined

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        tenant_payment_accounts: (state) => {
          upsertRow = state.rows?.[0] as Record<string, unknown>
          return { data: null, error: null }
        },
      }) as never
    )

    await tenantMercadoPago.upsertTenantMercadoPagoAccount({
      tenantId: 'tenant-1',
      tokens: {
        access_token: 'access',
        refresh_token: 'refresh',
        user_id: 123,
        expires_in: 3600,
        live_mode: true,
        public_key: 'pk',
        scope: 'read',
      },
    })

    expect(encryptSecret).toHaveBeenCalledWith('access')
    expect(encryptSecret).toHaveBeenCalledWith('refresh')
    expect(upsertRow).toMatchObject({
      tenant_id: 'tenant-1',
      provider: 'mercado_pago',
      mercado_pago_user_id: '123',
      access_token_encrypted: 'enc:access',
      refresh_token_encrypted: 'enc:refresh',
      public_key: 'pk',
      scope: 'read',
      live_mode: true,
      status: 'connected',
    })
  })

  it('getTenantMercadoPagoAccessToken retorna null para conta ausente ou desconectada', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        tenant_payment_accounts: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(tenantMercadoPago.getTenantMercadoPagoAccessToken('tenant-1')).resolves.toBeNull()
  })

  it('getTenantMercadoPagoAccessToken reaproveita token ainda válido', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        tenant_payment_accounts: () => ({
          data: {
            tenant_id: 'tenant-1',
            status: 'connected',
            token_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8).toISOString(),
            access_token_encrypted: 'enc:access-current',
            refresh_token_encrypted: 'enc:refresh-current',
          },
          error: null,
        }),
      }) as never
    )

    await expect(tenantMercadoPago.getTenantMercadoPagoAccessToken('tenant-1')).resolves.toBe('access-current')
    expect(decryptSecret).toHaveBeenCalledWith('enc:access-current')
  })

  it('getMercadoPagoAccessTokenBySellerUserId usa fallback quando nao encontra vendedor', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        tenant_payment_accounts: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(tenantMercadoPago.getMercadoPagoAccessTokenBySellerUserId('seller-1')).resolves.toBe('fallback-token')
    await expect(tenantMercadoPago.getMercadoPagoAccessTokenBySellerUserId()).resolves.toBe('fallback-token')
  })

  it('getTenantMercadoPagoAccessToken faz refresh quando o token está perto do vencimento', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-refreshed',
          refresh_token: 'refresh-refreshed',
          user_id: 123,
          expires_in: 7200,
        }),
        { status: 200 }
      )
    )

    const rows: Record<string, unknown>[] = []
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        tenant_payment_accounts: (state) => {
          if (state.operation === 'select') {
            return {
              data: {
                tenant_id: 'tenant-1',
                status: 'connected',
                token_expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
                access_token_encrypted: 'enc:access-old',
                refresh_token_encrypted: 'enc:refresh-old',
              },
              error: null,
            }
          }

          rows.push((state.rows?.[0] ?? {}) as Record<string, unknown>)
          return { data: null, error: null }
        },
      }) as never
    )

    await expect(tenantMercadoPago.getTenantMercadoPagoAccessToken('tenant-1')).resolves.toBe(
      'access-refreshed'
    )
    expect(decryptSecret).toHaveBeenCalledWith('enc:refresh-old')
    expect(rows[0]).toMatchObject({
      tenant_id: 'tenant-1',
      access_token_encrypted: 'enc:access-refreshed',
      refresh_token_encrypted: 'enc:refresh-refreshed',
    })
  })

  it('getMercadoPagoAccessTokenBySellerUserId resolve tenant e exchange OAuth trata erro da API', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        tenant_payment_accounts: () => ({
          data: {
            tenant_id: 'tenant-9',
            status: 'connected',
            token_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8).toISOString(),
            access_token_encrypted: 'enc:access-tenant-9',
            refresh_token_encrypted: 'enc:refresh-tenant-9',
          },
          error: null,
        }),
      }) as never
    )

    await expect(tenantMercadoPago.getMercadoPagoAccessTokenBySellerUserId('seller-9')).resolves.toBe(
      'access-tenant-9'
    )

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'oauth failed' }), { status: 400 })
    )

    await expect(
      tenantMercadoPago.exchangeMercadoPagoAuthorizationCode('bad-code')
    ).rejects.toThrow('oauth failed')
  })
})
