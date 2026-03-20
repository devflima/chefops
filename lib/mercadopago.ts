import crypto from 'node:crypto'

const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com'

export class MercadoPagoApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'MercadoPagoApiError'
    this.status = status
    this.details = details
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required Mercado Pago env: ${name}`)
  }

  return value
}

export function getMercadoPagoAccessToken() {
  return getRequiredEnv('MERCADO_PAGO_ACCESS_TOKEN')
}

export function getMercadoPagoWebhookUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    throw new Error('Missing NEXT_PUBLIC_APP_URL for Mercado Pago webhook configuration.')
  }

  return `${appUrl}/api/mercado-pago/webhook`
}

async function mercadoPagoRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string; accessToken?: string } = {}
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${init.accessToken ?? getMercadoPagoAccessToken()}`)
  headers.set('Content-Type', 'application/json')

  if (init.idempotencyKey) {
    headers.set('X-Idempotency-Key', init.idempotencyKey)
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
    ...init,
    headers,
  })

  const json = await response.json()

  if (!response.ok) {
    const message =
      json?.message || json?.error || 'Mercado Pago request failed.'
    throw new MercadoPagoApiError(message, response.status, json)
  }

  return json as T
}

type PreferenceItem = {
  title: string
  quantity: number
  unit_price: number
  currency_id?: 'BRL'
}

type SubscriptionPreapproval = {
  id: string
  init_point?: string | null
  status: string
  reason?: string | null
  external_reference?: string | null
  payer_email?: string | null
  next_payment_date?: string | null
  date_created?: string | null
  last_modified?: string | null
}

type CreatePreferencePayload = {
  external_reference: string
  items: PreferenceItem[]
  accessToken?: string
  payer?: {
    name?: string
    email?: string
  }
  metadata?: Record<string, string>
  notificationUrl?: string
  backUrls?: {
    success: string
    pending: string
    failure: string
  }
}

export async function createCheckoutPreference(payload: CreatePreferencePayload) {
  return mercadoPagoRequest<{
    id: string
    init_point: string
    sandbox_init_point: string | null
  }>('/checkout/preferences', {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    body: JSON.stringify({
      items: payload.items,
      external_reference: payload.external_reference,
      payer: payload.payer,
      metadata: payload.metadata,
      notification_url: payload.notificationUrl ?? getMercadoPagoWebhookUrl(),
      statement_descriptor: 'CHEFOPS',
      auto_return: 'approved',
      back_urls: payload.backUrls ?? {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/pedidos`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/pedidos`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/pedidos`,
      },
    }),
    accessToken: payload.accessToken,
  })
}

export async function getPaymentById(paymentId: string, accessToken?: string | null) {
  return mercadoPagoRequest<{
    id: number
    status: string
    external_reference?: string | null
    metadata?: Record<string, string>
    date_approved?: string | null
    date_last_updated?: string | null
  }>(`/v1/payments/${paymentId}`, {
    method: 'GET',
    accessToken: accessToken ?? undefined,
  })
}

export async function refundPaymentById(params: {
  paymentId: string
  accessToken: string
  amount?: number
}) {
  return mercadoPagoRequest<{
    id: number
    amount?: number
    status?: string
  }>(`/v1/payments/${params.paymentId}/refunds`, {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    accessToken: params.accessToken,
    body: JSON.stringify(
      typeof params.amount === 'number' ? { amount: params.amount } : {}
    ),
  })
}

export async function createSaasSubscriptionLink(params: {
  reason: string
  payerEmail: string
  externalReference: string
  amount: number
  accessToken?: string
  backUrl: string
}) {
  return mercadoPagoRequest<SubscriptionPreapproval>('/preapproval', {
    method: 'POST',
    idempotencyKey: crypto.randomUUID(),
    accessToken: params.accessToken,
    body: JSON.stringify({
      reason: params.reason,
      payer_email: params.payerEmail,
      external_reference: params.externalReference,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.amount,
        currency_id: 'BRL',
      },
      back_url: params.backUrl,
      status: 'pending',
    }),
  })
}

export async function getPreapprovalById(preapprovalId: string, accessToken?: string) {
  return mercadoPagoRequest<SubscriptionPreapproval>(`/preapproval/${preapprovalId}`, {
    method: 'GET',
    accessToken,
  })
}

function parseSignatureHeader(value: string | null) {
  if (!value) return null

  const pairs = Object.fromEntries(
    value.split(',').map((item) => {
      const [key, rawValue] = item.split('=')
      return [key?.trim(), rawValue?.trim()]
    })
  )

  if (!pairs.ts || !pairs.v1) return null

  return {
    ts: pairs.ts,
    v1: pairs.v1,
  }
}

export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string
}) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

  if (!secret) return true

  const parsed = parseSignatureHeader(params.xSignature)
  if (!parsed || !params.xRequestId || !params.dataId) return false

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId};ts:${parsed.ts};`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  if (expected.length !== parsed.v1.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(parsed.v1)
  )
}

export function getOrderIdFromExternalReference(reference?: string | null) {
  if (!reference) return null

  const match = reference.match(/order:([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

export function getCheckoutSessionIdFromExternalReference(reference?: string | null) {
  if (!reference) return null

  const match = reference.match(/checkout:([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

export function mapMercadoPagoStatusToOrderPaymentStatus(status: string) {
  if (status === 'approved') return 'paid' as const
  if (['refunded', 'charged_back', 'cancelled'].includes(status)) {
    return 'refunded' as const
  }

  return 'pending' as const
}
