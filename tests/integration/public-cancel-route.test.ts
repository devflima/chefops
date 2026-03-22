import { describe, expect, it } from 'vitest'

import { cancelPublicOrder } from '@/app/api/public/orders/[id]/cancel/route'
import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

describe('public cancel route', () => {
  it('cancelPublicOrder rejeita pedido fora dos status canceláveis', async () => {
    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-1', status: 'delivered' },
            error: null,
          }
        }

        throw new Error('Nenhuma outra query deveria ser executada')
      },
    })

    const response = await cancelPublicOrder(
      {
        json: async () => ({}),
      },
      'order-1',
      {
        createAdminClient: () => admin as never,
        refundOrderIfNeeded: async () => ({ refunded: false, reason: 'noop' }),
        sendOrderWhatsappNotification: async () => ({ sent: false, reason: 'noop' }),
      }
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: 'Este pedido não pode mais ser cancelado pelo cliente.',
    })
  })

  it('cancelPublicOrder cancela, tenta reembolso e devolve pedido atualizado', async () => {
    let updateValues: Record<string, unknown> | undefined
    let refundOrderId: string | undefined
    let notifiedOrderId: string | undefined

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-1', status: 'pending' },
            error: null,
          }
        }

        if (state.operation === 'update') {
          updateValues = state.values
          return { data: null, error: null }
        }

        return {
          data: {
            id: 'order-1',
            order_number: 77,
            status: 'cancelled',
            payment_status: 'refunded',
            refunded_at: '2026-03-20T12:00:00.000Z',
            created_at: '2026-03-20T10:00:00.000Z',
            updated_at: '2026-03-20T12:00:00.000Z',
          },
          error: null,
        }
      },
    })

    const response = await cancelPublicOrder(
      {
        json: async () => ({
          cancelled_reason: ' Cliente desistiu ',
        }),
      },
      'order-1',
      {
        createAdminClient: () => admin as never,
        refundOrderIfNeeded: async (orderId) => {
          refundOrderId = orderId
          return { refunded: true }
        },
        sendOrderWhatsappNotification: async ({ orderId }) => {
          notifiedOrderId = orderId
          return { sent: true }
        },
      }
    )

    expect(response.status).toBe(200)
    expect(updateValues).toEqual({
      status: 'cancelled',
      cancelled_reason: 'Cliente desistiu',
    })
    expect(refundOrderId).toBe('order-1')
    expect(notifiedOrderId).toBe('order-1')
    expect((await response.json()).data.status).toBe('cancelled')
  })

  it('cancelPublicOrder devolve 404 quando pedido não existe', async () => {
    const admin = createMockSupabaseClient({
      orders: () => ({
        data: null,
        error: new Error('missing'),
      }),
    })

    const response = await cancelPublicOrder(
      {
        json: async () => ({}),
      },
      'order-404',
      {
        createAdminClient: () => admin as never,
        refundOrderIfNeeded: async () => ({ refunded: false }),
        sendOrderWhatsappNotification: async () => ({ sent: false }),
      }
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: 'Pedido não encontrado.',
    })
  })

  it('cancelPublicOrder usa motivo padrão e retorna 500 quando update falha', async () => {
    let updateValues: Record<string, unknown> | undefined

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-1', status: 'confirmed' },
            error: null,
          }
        }

        if (state.operation === 'update') {
          updateValues = state.values
          return {
            data: null,
            error: new Error('update failed'),
          }
        }

        throw new Error('Nenhuma outra query deveria ser executada')
      },
    })

    const response = await cancelPublicOrder(
      {
        json: async () => {
          throw new Error('bad json')
        },
      },
      'order-1',
      {
        createAdminClient: () => admin as never,
        refundOrderIfNeeded: async () => ({ refunded: false }),
        sendOrderWhatsappNotification: async () => ({ sent: false }),
      }
    )

    expect(updateValues).toEqual({
      status: 'cancelled',
      cancelled_reason: 'Cancelado pelo cliente',
    })
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'update failed',
    })
  })

  it('cancelPublicOrder retorna 500 quando não consegue recarregar o pedido atualizado', async () => {
    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-1', status: 'pending' },
            error: null,
          }
        }

        if (state.operation === 'update') {
          return { data: null, error: null }
        }

        return {
          data: null,
          error: null,
        }
      },
    })

    const response = await cancelPublicOrder(
      {
        json: async () => ({}),
      },
      'order-1',
      {
        createAdminClient: () => admin as never,
        refundOrderIfNeeded: async () => ({ refunded: false }),
        sendOrderWhatsappNotification: async () => ({ sent: false }),
      }
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'Pedido cancelado, mas não foi possível recarregar os dados.',
    })
  })
})
