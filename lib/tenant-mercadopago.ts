import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/crypto'

type OAuthTokenResponse = {
  access_token: string
  refresh_token: string
  public_key?: string
  user_id: number
  expires_in: number
  scope?: string
  live_mode?: boolean
}

function getOAuthEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing Mercado Pago OAuth env: ${name}`)
  }

  return value
}

export function getMercadoPagoOAuthRedirectUri() {
  return (
    process.env.MERCADO_PAGO_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL}/api/mercado-pago/oauth/callback`
  )
}

export function getMercadoPagoOAuthAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getOAuthEnv('MERCADO_PAGO_CLIENT_ID'),
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: getMercadoPagoOAuthRedirectUri(),
  })

  return `https://auth.mercadopago.com.br/authorization?${params.toString()}`
}

async function exchangeOAuthCode(body: Record<string, string>) {
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: getOAuthEnv('MERCADO_PAGO_CLIENT_ID'),
      client_secret: getOAuthEnv('MERCADO_PAGO_CLIENT_SECRET'),
      ...body,
    }),
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json?.message || json?.error || 'Mercado Pago OAuth failed.')
  }

  return json as OAuthTokenResponse
}

export async function exchangeMercadoPagoAuthorizationCode(code: string) {
  return exchangeOAuthCode({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getMercadoPagoOAuthRedirectUri(),
  })
}

export async function refreshMercadoPagoAccessToken(refreshToken: string) {
  return exchangeOAuthCode({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

export async function upsertTenantMercadoPagoAccount(params: {
  tenantId: string
  tokens: OAuthTokenResponse
}) {
  const admin = createAdminClient()
  const expiresAt = new Date(Date.now() + params.tokens.expires_in * 1000).toISOString()

  const { error } = await admin
    .from('tenant_payment_accounts')
    .upsert({
      tenant_id: params.tenantId,
      provider: 'mercado_pago',
      mercado_pago_user_id: String(params.tokens.user_id),
      access_token_encrypted: encryptSecret(params.tokens.access_token),
      refresh_token_encrypted: encryptSecret(params.tokens.refresh_token),
      public_key: params.tokens.public_key ?? null,
      scope: params.tokens.scope ?? null,
      live_mode: params.tokens.live_mode ?? false,
      status: 'connected',
      token_expires_at: expiresAt,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'tenant_id,provider',
    })

  if (error) throw error
}

export async function getTenantMercadoPagoAccount(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenant_payment_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'mercado_pago')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getTenantMercadoPagoAccessToken(tenantId: string) {
  const account = await getTenantMercadoPagoAccount(tenantId)

  if (!account || account.status !== 'connected') {
    return null
  }

  const now = Date.now()
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0

  if (expiresAt > now + 1000 * 60 * 60 * 24 * 7) {
    return decryptSecret(account.access_token_encrypted)
  }

  const refreshed = await refreshMercadoPagoAccessToken(
    decryptSecret(account.refresh_token_encrypted)
  )

  await upsertTenantMercadoPagoAccount({
    tenantId,
    tokens: refreshed,
  })

  return refreshed.access_token
}

export async function getMercadoPagoAccessTokenBySellerUserId(userId?: string | number | null) {
  if (!userId) return process.env.MERCADO_PAGO_ACCESS_TOKEN ?? null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenant_payment_accounts')
    .select('tenant_id')
    .eq('provider', 'mercado_pago')
    .eq('mercado_pago_user_id', String(userId))
    .maybeSingle()

  if (error) throw error
  if (!data?.tenant_id) return process.env.MERCADO_PAGO_ACCESS_TOKEN ?? null

  return getTenantMercadoPagoAccessToken(data.tenant_id)
}
