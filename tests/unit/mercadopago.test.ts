import crypto from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createCheckoutPreference,
  createSaasSubscriptionLink,
  getCheckoutSessionIdFromExternalReference,
  getPaymentById,
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookUrl,
  getOrderIdFromExternalReference,
  getPreapprovalById,
  isMercadoPagoTestAccessToken,
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
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    delete process.env.NEXT_PUBLIC_APP_URL

    expect(() => getMercadoPagoAccessToken()).toThrow(/MERCADO_PAGO_ACCESS_TOKEN/)
    expect(() => getMercadoPagoWebhookUrl()).toThrow(/NEXT_PUBLIC_APP_URL/)
  })

  it('identifica access token de teste do Mercado Pago', () => {
    expect(isMercadoPagoTestAccessToken('TEST-123')).toBe(true)
    expect(isMercadoPagoTestAccessToken('APP_USR-123')).toBe(false)
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

  it('createCheckoutPreference respeita access token e payload customizado', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-default'
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'pref-custom',
          init_point: 'https://pay.test/custom',
          sandbox_init_point: null,
        }),
        { status: 200 }
      )
    )

    await createCheckoutPreference({
      external_reference: 'order:custom',
      accessToken: 'tenant-token',
      items: [{ title: 'Pizza', quantity: 1, unit_price: 50 }],
      payer: { name: 'Felipe', email: 'owner@test.com' },
      metadata: { source: 'menu' },
      notificationUrl: 'https://callback.test/mp',
      backUrls: {
        success: 'https://chefops.test/success',
        pending: 'https://chefops.test/pending',
        failure: 'https://chefops.test/failure',
      },
    })

    const request = fetchMock.mock.calls[0]?.[1]
    const headers = request?.headers as Headers
    const body = JSON.parse(String(request?.body))

    expect(headers.get('Authorization')).toBe('Bearer tenant-token')
    expect(body).toMatchObject({
      payer: { name: 'Felipe', email: 'owner@test.com' },
      metadata: { source: 'menu' },
      notification_url: 'https://callback.test/mp',
      back_urls: {
        success: 'https://chefops.test/success',
        pending: 'https://chefops.test/pending',
        failure: 'https://chefops.test/failure',
      },
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

    const firstRequest = vi.mocked(globalThis.fetch).mock.calls[0]?.[1]
    expect(JSON.parse(String(firstRequest?.body))).toMatchObject({
      payer_email: 'owner@test.com',
    })

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

  it('getPaymentById usa token customizado e fallback global, e assinatura propaga erro padrão', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'fallback-token'

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 10, status: 'approved' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 11, status: 'pending' }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 500 })
      )

    await expect(getPaymentById('pay-10', 'tenant-token')).resolves.toMatchObject({
      id: 10,
      status: 'approved',
    })

    let request = fetchMock.mock.calls[0]?.[1]
    let headers = request?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer tenant-token')

    await expect(getPaymentById('pay-11')).resolves.toMatchObject({
      id: 11,
      status: 'pending',
    })

    request = fetchMock.mock.calls[1]?.[1]
    headers = request?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer fallback-token')

    await expect(
      createSaasSubscriptionLink({
        reason: 'ChefOps Premium',
        payerEmail: 'owner@test.com',
        externalReference: 'saas:tenant:1:plan:pro',
        amount: 189,
        backUrl: 'https://chefops.test/planos',
      })
    ).rejects.toMatchObject({
      name: 'MercadoPagoApiError',
      message: 'Mercado Pago request failed.',
      status: 500,
    })
  })

  it('omite payer_email ao criar assinatura SaaS com access token de teste', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-123'

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'pre-test', status: 'pending' }), { status: 200 })
    )

    await expect(
      createSaasSubscriptionLink({
        reason: 'ChefOps Premium',
        payerEmail: 'owner@test.com',
        externalReference: 'saas:tenant:1:plan:pro',
        amount: 189,
        backUrl: 'https://chefops.test/planos',
      })
    ).resolves.toMatchObject({ id: 'pre-test', status: 'pending' })

    const request = fetchMock.mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body))).not.toHaveProperty('payer_email')
  })

  it('refaz a assinatura SaaS sem payer_email quando o Mercado Pago detecta mismatch de ambiente', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-123'

    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'Both payer and collector must be real or test users' }),
          { status: 400 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'pre-fallback', status: 'pending' }), { status: 200 })
      )

    await expect(
      createSaasSubscriptionLink({
        reason: 'ChefOps Premium',
        payerEmail: 'owner@test.com',
        externalReference: 'saas:tenant:1:plan:pro',
        amount: 189,
        backUrl: 'https://chefops.test/planos',
      })
    ).resolves.toMatchObject({ id: 'pre-fallback', status: 'pending' })

    const firstRequest = fetchMock.mock.calls[0]?.[1]
    const secondRequest = fetchMock.mock.calls[1]?.[1]

    expect(JSON.parse(String(firstRequest?.body))).toMatchObject({
      payer_email: 'owner@test.com',
    })
    expect(JSON.parse(String(secondRequest?.body))).not.toHaveProperty('payer_email')
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

  it('verifyMercadoPagoWebhookSignature falha com header incompleto ou request/data ausentes', () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'webhook-secret'

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: null,
        xRequestId: 'req-1',
        dataId: 'abc',
      })
    ).toBe(false)

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: 'ts=1710000000',
        xRequestId: 'req-1',
        dataId: 'abc',
      })
    ).toBe(false)

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: 'ts=1710000000,v1=abcd',
        xRequestId: null,
        dataId: 'abc',
      })
    ).toBe(false)

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: 'ts=1710000000,v1=abcd',
        xRequestId: 'req-1',
        dataId: '',
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
    expect(getOrderIdFromExternalReference('tenant:abc')).toBeNull()
    expect(getCheckoutSessionIdFromExternalReference('order:abc')).toBeNull()
    expect(getOrderIdFromExternalReference(null)).toBeNull()
    expect(getCheckoutSessionIdFromExternalReference(null)).toBeNull()
    expect(mapMercadoPagoStatusToOrderPaymentStatus('approved')).toBe('paid')
    expect(mapMercadoPagoStatusToOrderPaymentStatus('refunded')).toBe('refunded')
    expect(mapMercadoPagoStatusToOrderPaymentStatus('charged_back')).toBe('refunded')
    expect(mapMercadoPagoStatusToOrderPaymentStatus('cancelled')).toBe('refunded')
    expect(mapMercadoPagoStatusToOrderPaymentStatus('in_process')).toBe('pending')
  })
})
