import crypto from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createCheckoutPreference,
  createSaasSubscriptionLink,
  getCheckoutSessionIdFromExternalReference,
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookUrl,
  getOrderIdFromExternalReference,
  getPreapprovalById,
  mapMercadoPagoStatusToOrderPaymentStatus,
  refundPaymentById,
  updatePreapprovalById,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/mercadopago'

describe('mercadopago helpers', () => {
  afterEach(() => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    delete process.env.NEXT_PUBLIC_APP_URL
    vi.restoreAllMocks()
  })

  it('lanca erro quando envs obrigatorias nao existem', () => {
    expect(() => getMercadoPagoAccessToken()).toThrow(/MERCADO_PAGO_ACCESS_TOKEN/)
    expect(() => getMercadoPagoWebhookUrl()).toThrow(/NEXT_PUBLIC_APP_URL/)
  })

  it('createCheckoutPreference envia payload padrao para o Mercado Pago', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-123'
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'pref-1',
          init_point: 'https://pay.test',
          sandbox_init_point: 'https://sandbox.test',
        }),
        { status: 200 }
      )
    )

    const result = await createCheckoutPreference({
      external_reference: 'order:1',
      items: [{ title: 'Pizza', quantity: 1, unit_price: 50 }],
    })

    expect(result.id).toBe('pref-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/checkout/preferences',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      })
    )
    const request = fetchMock.mock.calls[0]?.[1]
    const headers = request?.headers as Headers
    const body = JSON.parse(String(request?.body))
    expect(headers.get('Authorization')).toBe('Bearer token-123')
    expect(headers.get('X-Idempotency-Key')).toBeTruthy()
    expect(body).toMatchObject({
      external_reference: 'order:1',
      notification_url: 'https://chefops.test/api/mercado-pago/webhook',
      statement_descriptor: 'CHEFOPS',
      auto_return: 'approved',
    })
  })

  it('refundPaymentById envia amount opcional e propaga erro da API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, amount: 12 }), { status: 200 })
    )

    await expect(
      refundPaymentById({
        paymentId: 'pay-1',
        accessToken: 'tenant-token',
        amount: 12,
      })
    ).resolves.toEqual({
      id: 1,
      amount: 12,
    })

    const successCall = vi.mocked(globalThis.fetch).mock.calls[0]?.[1]
    expect(JSON.parse(String(successCall?.body))).toEqual({ amount: 12 })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'forbidden' }), { status: 403 })
    )

    await expect(
      refundPaymentById({
        paymentId: 'pay-1',
        accessToken: 'tenant-token',
      })
    ).rejects.toMatchObject({
      name: 'MercadoPagoApiError',
      status: 403,
    })
  })

  it('opera endpoints de assinatura SaaS', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-123'

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'pre-1', status: 'pending' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'pre-1', status: 'authorized' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'pre-1', status: 'cancelled' }), { status: 200 })
      )

    await expect(
      createSaasSubscriptionLink({
        reason: 'ChefOps Premium',
        payerEmail: 'owner@test.com',
        externalReference: 'saas:tenant:1:plan:pro',
        amount: 189,
        backUrl: 'https://chefops.test/planos',
      })
    ).resolves.toMatchObject({ id: 'pre-1', status: 'pending' })

    await expect(getPreapprovalById('pre-1', 'tenant-token')).resolves.toMatchObject({
      id: 'pre-1',
      status: 'authorized',
    })

    await expect(
      updatePreapprovalById({
        preapprovalId: 'pre-1',
        body: { status: 'cancelled' },
        accessToken: 'tenant-token',
      })
    ).resolves.toMatchObject({
      id: 'pre-1',
      status: 'cancelled',
    })
  })

  it('verifyMercadoPagoWebhookSignature valida manifesto assinado', () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'webhook-secret'

    const dataId = 'ABC-123'
    const requestId = 'req-1'
    const ts = '1710000000'
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
    const signature = crypto.createHmac('sha256', 'webhook-secret').update(manifest).digest('hex')

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=${signature}`,
        xRequestId: requestId,
        dataId,
      })
    ).toBe(true)

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=deadbeef`,
        xRequestId: requestId,
        dataId,
      })
    ).toBe(false)
  })

  it('verifyMercadoPagoWebhookSignature aceita webhook quando secret não está configurado', () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: null,
        xRequestId: null,
        dataId: '',
      })
    ).toBe(true)
  })

  it('extrai ids do external_reference e mapeia status', () => {
    expect(
      getOrderIdFromExternalReference('order:123e4567-e89b-12d3-a456-426614174000:tenant:abc')
    ).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(
      getCheckoutSessionIdFromExternalReference('checkout:123e4567-e89b-12d3-a456-426614174999')
    ).toBe('123e4567-e89b-12d3-a456-426614174999')
    expect(mapMercadoPagoStatusToOrderPaymentStatus('approved')).toBe('paid')
    expect(mapMercadoPagoStatusToOrderPaymentStatus('refunded')).toBe('refunded')
    expect(mapMercadoPagoStatusToOrderPaymentStatus('in_process')).toBe('pending')
  })
})
