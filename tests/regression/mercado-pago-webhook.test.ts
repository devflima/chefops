import { describe, expect, it } from 'vitest'

import { handleMercadoPagoWebhook } from '@/app/api/mercado-pago/webhook/route'
import { MercadoPagoApiError } from '@/lib/mercadopago'
import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

function createWebhookRequest(
  body: unknown,
  url = 'https://chefops.test/api/mercado-pago/webhook?topic=payment&data.id=pay-1'
) {
  const request = new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req-1',
      'x-signature': 'ts=1,v1=signature',
    },
    body: JSON.stringify(body),
  })

  return {
    json: () => request.json(),
    headers: request.headers,
    nextUrl: new URL(request.url),
  }
}

describe('mercado pago webhook regression', () => {
  it('handleMercadoPagoWebhook rejeita assinatura inválida', async () => {
    const response = await handleMercadoPagoWebhook(
      createWebhookRequest({ type: 'payment', data: { id: 'pay-1' } }),
      {
        verifyMercadoPagoWebhookSignature: () => false,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => null,
        getPaymentById: async () => ({ id: 1, status: 'approved' }),
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => null,
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'paid',
        createAdminClient: () => createMockSupabaseClient({}) as never,
        createOrderFromCheckoutSession: async () => undefined,
      }
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Assinatura inválida.' })
  })

  it('handleMercadoPagoWebhook sincroniza preapproval de assinatura', async () => {
    let syncedPreapprovalId: string | undefined

    const response = await handleMercadoPagoWebhook(
      createWebhookRequest(
        { type: 'subscription_preapproval', data: { id: 'pre-1' } },
        'https://chefops.test/api/mercado-pago/webhook'
      ),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async (id) => ({ id, status: 'authorized' }),
        syncTenantFromSaasSubscription: async (preapproval) => {
          syncedPreapprovalId = preapproval.id
          return { synced: true, tenantId: 'tenant-1' }
        },
        getMercadoPagoAccessTokenBySellerUserId: async () => null,
        getPaymentById: async () => ({ id: 1, status: 'approved' }),
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => null,
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'paid',
        createAdminClient: () => createMockSupabaseClient({}) as never,
        createOrderFromCheckoutSession: async () => undefined,
      }
    )

    expect(response.status).toBe(200)
    expect(syncedPreapprovalId).toBe('pre-1')
    expect(await response.json()).toEqual({ received: true })
  })

  it('handleMercadoPagoWebhook ignora payment inexistente no Mercado Pago', async () => {
    const response = await handleMercadoPagoWebhook(
      createWebhookRequest({ type: 'payment', data: { id: 'pay-404' }, user_id: 'seller-1' }),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => 'seller-token',
        getPaymentById: async () => {
          throw new MercadoPagoApiError('not found', 404)
        },
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => null,
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'paid',
        createAdminClient: () => createMockSupabaseClient({}) as never,
        createOrderFromCheckoutSession: async () => undefined,
      }
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      received: true,
      ignored: 'payment_not_found',
    })
  })

  it('handleMercadoPagoWebhook atualiza checkout aprovado e cria pedido uma única vez', async () => {
    let sessionUpdateValues: Record<string, unknown> | undefined
    let createdOrderPayload: Record<string, unknown> | undefined

    const admin = createMockSupabaseClient({
      checkout_sessions: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'checkout-1',
              payload: { items: [{ name: 'Pizza' }] },
              created_order_id: null,
            },
            error: null,
          }
        }

        sessionUpdateValues = state.values
        return { data: null, error: null }
      },
    })

    const response = await handleMercadoPagoWebhook(
      createWebhookRequest({
        type: 'payment',
        data: { id: 'pay-1' },
        user_id: 'seller-1',
      }),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => 'seller-token',
        getPaymentById: async () => ({
          id: 10,
          status: 'approved',
          external_reference: 'checkout:checkout-1',
          metadata: {},
          date_approved: '2026-03-20T12:00:00.000Z',
        }),
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => 'checkout-1',
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'paid',
        createAdminClient: () => admin as never,
        createOrderFromCheckoutSession: async (payload) => {
          createdOrderPayload = payload as Record<string, unknown>
        },
      }
    )

    expect(response.status).toBe(200)
    expect(sessionUpdateValues).toEqual({
      status: 'approved',
      mercado_pago_payment_id: '10',
      paid_at: '2026-03-20T12:00:00.000Z',
    })
    expect(createdOrderPayload).toEqual({
      checkoutSessionId: 'checkout-1',
      payload: { items: [{ name: 'Pizza' }] },
      paymentId: '10',
    })
    expect(await response.json()).toEqual({ received: true })
  })

  it('handleMercadoPagoWebhook ignora eventos não-payment e checkout session ausente', async () => {
    const ignoredResponse = await handleMercadoPagoWebhook(
      createWebhookRequest(
        { type: 'topic-unknown', data: { id: 'other-1' } },
        'https://chefops.test/api/mercado-pago/webhook?topic=merchant_order'
      ),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => null,
        getPaymentById: async () => ({ id: 1, status: 'approved' }),
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => null,
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'paid',
        createAdminClient: () => createMockSupabaseClient({}) as never,
        createOrderFromCheckoutSession: async () => undefined,
      }
    )

    expect(ignoredResponse.status).toBe(200)
    expect(await ignoredResponse.json()).toEqual({ received: true })

    const missingCheckoutResponse = await handleMercadoPagoWebhook(
      createWebhookRequest({ type: 'payment', data: { id: 'pay-2' }, user_id: 'seller-1' }),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => 'seller-token',
        getPaymentById: async () => ({
          id: 22,
          status: 'approved',
          external_reference: 'checkout:missing',
          metadata: {},
        }),
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => 'missing',
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'paid',
        createAdminClient: () =>
          createMockSupabaseClient({
            checkout_sessions: () => ({ data: null, error: new Error('missing') }),
          }) as never,
        createOrderFromCheckoutSession: async () => undefined,
      }
    )

    expect(missingCheckoutResponse.status).toBe(200)
    expect(await missingCheckoutResponse.json()).toEqual({
      received: true,
      ignored: 'checkout_session_not_found',
    })
  })

  it('handleMercadoPagoWebhook atualiza checkout não aprovado sem criar pedido', async () => {
    let sessionUpdateValues: Record<string, unknown> | undefined
    let createdOrderCalled = false

    const admin = createMockSupabaseClient({
      checkout_sessions: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'checkout-2',
              payload: { items: [{ name: 'Pizza' }] },
              created_order_id: 'order-existing',
            },
            error: null,
          }
        }

        sessionUpdateValues = state.values
        return { data: null, error: null }
      },
    })

    const response = await handleMercadoPagoWebhook(
      createWebhookRequest({
        type: 'payment',
        data: { id: 'pay-4' },
        user_id: 'seller-1',
      }),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => 'seller-token',
        getPaymentById: async () => ({
          id: 44,
          status: 'rejected',
          external_reference: 'checkout:checkout-2',
          metadata: {},
          date_last_updated: '2026-03-20T13:00:00.000Z',
        }),
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => 'checkout-2',
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'failed',
        createAdminClient: () => admin as never,
        createOrderFromCheckoutSession: async () => {
          createdOrderCalled = true
        },
      }
    )

    expect(response.status).toBe(200)
    expect(sessionUpdateValues).toEqual({
      status: 'rejected',
      mercado_pago_payment_id: '44',
      paid_at: '2026-03-20T13:00:00.000Z',
    })
    expect(createdOrderCalled).toBe(false)
  })

  it('handleMercadoPagoWebhook devolve 500 quando falha atualização de pedido', async () => {
    const failingAdmin = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            update: () => ({
              eq: async () => ({ error: new Error('order update failed') }),
            }),
          }
        }

        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }
      },
    }

    const response = await handleMercadoPagoWebhook(
      createWebhookRequest({ type: 'payment', data: { id: 'pay-3' }, user_id: 'seller-1' }),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => 'seller-token',
        getPaymentById: async () => ({
          id: 33,
          status: 'refunded',
          external_reference: 'order:order-1',
          metadata: {},
          date_last_updated: '2026-03-20T12:00:00.000Z',
        }),
        getOrderIdFromExternalReference: () => 'order-1',
        getCheckoutSessionIdFromExternalReference: () => null,
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'refunded',
        createAdminClient: () => failingAdmin as never,
        createOrderFromCheckoutSession: async () => undefined,
      }
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'Erro ao processar webhook do Mercado Pago.',
    })
  })

  it('handleMercadoPagoWebhook devolve 500 quando falha atualização da checkout session', async () => {
    const failingAdmin = {
      from: (table: string) => {
        if (table === 'checkout_sessions') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'checkout-3',
                    payload: { items: [] },
                    created_order_id: null,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: new Error('checkout update failed') }),
            }),
          }
        }

        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      },
    }

    const response = await handleMercadoPagoWebhook(
      createWebhookRequest({ type: 'payment', data: { id: 'pay-5' }, user_id: 'seller-1' }),
      {
        verifyMercadoPagoWebhookSignature: () => true,
        getPreapprovalById: async () => ({ id: 'pre', status: 'authorized' }),
        syncTenantFromSaasSubscription: async () => ({ synced: true, tenantId: 'tenant-1' }),
        getMercadoPagoAccessTokenBySellerUserId: async () => 'seller-token',
        getPaymentById: async () => ({
          id: 55,
          status: 'approved',
          external_reference: 'checkout:checkout-3',
          metadata: {},
          date_approved: '2026-03-20T14:00:00.000Z',
        }),
        getOrderIdFromExternalReference: () => null,
        getCheckoutSessionIdFromExternalReference: () => 'checkout-3',
        mapMercadoPagoStatusToOrderPaymentStatus: () => 'paid',
        createAdminClient: () => failingAdmin as never,
        createOrderFromCheckoutSession: async () => undefined,
      }
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'Erro ao processar webhook do Mercado Pago.',
    })
  })
})
