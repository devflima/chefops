import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/checkout-session', () => ({
  createOrderFromCheckoutSession: vi.fn(async () => undefined),
}))

vi.mock('@/lib/mercadopago', () => ({
  getPreapprovalById: vi.fn(async () => ({ id: 'pre-1', status: 'authorized' })),
  getCheckoutSessionIdFromExternalReference: vi.fn(() => null),
  getOrderIdFromExternalReference: vi.fn(() => null),
  MercadoPagoApiError: class MercadoPagoApiError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message)
      this.name = 'MercadoPagoApiError'
    }
  },
  getPaymentById: vi.fn(async () => ({ id: 1, status: 'approved', metadata: {} })),
  mapMercadoPagoStatusToOrderPaymentStatus: vi.fn(() => 'paid'),
  verifyMercadoPagoWebhookSignature: vi.fn(() => false),
}))

vi.mock('@/lib/saas-billing', () => ({
  syncTenantFromSaasSubscription: vi.fn(async () => ({ synced: true, tenantId: 'tenant-1' })),
}))

vi.mock('@/lib/tenant-mercadopago', () => ({
  getMercadoPagoAccessTokenBySellerUserId: vi.fn(async () => null),
}))

const { POST } = await import('@/app/api/mercado-pago/webhook/route')

describe('mercado pago webhook POST', () => {
  it('encaminha a request para o handler com as dependências padrão do módulo', async () => {
    const request = new Request('https://chefops.test/api/mercado-pago/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req-post',
        'x-signature': 'ts=1,v1=signature',
      },
      body: JSON.stringify({ type: 'payment', data: { id: 'pay-post' } }),
    })

    const response = await POST(request as never)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'Assinatura inválida.',
    })
  })
})
