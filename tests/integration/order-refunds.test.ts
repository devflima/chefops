import { beforeEach, describe, expect, it, vi } from 'vitest'

import { refundOrderIfNeededWithDeps } from '@/lib/order-refunds'
import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

describe('order refunds', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('refundOrderIfNeededWithDeps ignora pedido não pago', async () => {
    const admin = createMockSupabaseClient({
      orders: (state) => {
        expect(state.operation).toBe('select')
        return {
          data: {
            id: 'order-1',
            tenant_id: 'tenant-1',
            payment_status: 'pending',
            payment_provider: 'mercado_pago',
            payment_transaction_id: '123',
            refunded_at: null,
          },
          error: null,
        }
      },
    })

    const result = await refundOrderIfNeededWithDeps('order-1', {
      admin: admin as never,
      getTenantMercadoPagoAccessToken: async () => 'token',
      refundPaymentById: async () => ({ id: 1 }),
    })

    expect(result).toEqual({
      refunded: false,
      reason: 'not-paid-or-already-refunded',
    })
  })

  it('refundOrderIfNeededWithDeps reembolsa e atualiza pedido elegível', async () => {
    let updatedValues: Record<string, unknown> | undefined
    let refundPayload: { paymentId: string; accessToken: string } | undefined

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-1',
              tenant_id: 'tenant-1',
              payment_status: 'paid',
              payment_provider: 'mercado_pago',
              payment_transaction_id: 'pay-123',
              refunded_at: null,
            },
            error: null,
          }
        }

        updatedValues = state.values
        return { data: null, error: null }
      },
    })

    const result = await refundOrderIfNeededWithDeps('order-1', {
      admin: admin as never,
      getTenantMercadoPagoAccessToken: async () => 'tenant-token',
      refundPaymentById: async (payload) => {
        refundPayload = payload
        return { id: 1 }
      },
    })

    expect(result).toEqual({ refunded: true })
    expect(refundPayload).toEqual({
      paymentId: 'pay-123',
      accessToken: 'tenant-token',
    })
    expect(updatedValues?.payment_status).toBe('refunded')
    expect(typeof updatedValues?.refunded_at).toBe('string')
  })

  it('refundOrderIfNeededWithDeps cobre provider não suportado, token ausente, update error e pedido ausente', async () => {
    const unsupportedAdmin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-2',
          tenant_id: 'tenant-1',
          payment_status: 'paid',
          payment_provider: 'cash',
          payment_transaction_id: null,
          refunded_at: null,
        },
        error: null,
      }),
    })

    await expect(
      refundOrderIfNeededWithDeps('order-2', {
        admin: unsupportedAdmin as never,
        getTenantMercadoPagoAccessToken: async () => 'token',
        refundPaymentById: async () => ({ id: 1 }),
      })
    ).resolves.toEqual({
      refunded: false,
      reason: 'unsupported-provider',
    })

    const noTokenAdmin = createMockSupabaseClient({
      orders: () => ({
        data: {
          id: 'order-3',
          tenant_id: 'tenant-1',
          payment_status: 'paid',
          payment_provider: 'mercado_pago',
          payment_transaction_id: 'pay-3',
          refunded_at: null,
        },
        error: null,
      }),
    })

    await expect(
      refundOrderIfNeededWithDeps('order-3', {
        admin: noTokenAdmin as never,
        getTenantMercadoPagoAccessToken: async () => null,
        refundPaymentById: async () => ({ id: 1 }),
      })
    ).rejects.toThrow('Mercado Pago não conectado para este estabelecimento.')

    const updateErrorAdmin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'order-4',
              tenant_id: 'tenant-1',
              payment_status: 'paid',
              payment_provider: 'mercado_pago',
              payment_transaction_id: 'pay-4',
              refunded_at: null,
            },
            error: null,
          }
        }

        return { data: null, error: new Error('update failed') }
      },
    })

    await expect(
      refundOrderIfNeededWithDeps('order-4', {
        admin: updateErrorAdmin as never,
        getTenantMercadoPagoAccessToken: async () => 'token',
        refundPaymentById: async () => ({ id: 1 }),
      })
    ).rejects.toThrow('update failed')

    const missingOrderAdmin = createMockSupabaseClient({
      orders: () => ({
        data: null,
        error: null,
      }),
    })

    await expect(
      refundOrderIfNeededWithDeps('missing-order', {
        admin: missingOrderAdmin as never,
        getTenantMercadoPagoAccessToken: async () => 'token',
        refundPaymentById: async () => ({ id: 1 }),
      })
    ).rejects.toThrow('Pedido não encontrado para reembolso.')
  })
})
