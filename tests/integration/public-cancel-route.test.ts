import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/order-refunds', () => ({
  refundOrderIfNeeded: vi.fn(),
}))

vi.mock('@/lib/order-whatsapp', () => ({
  sendOrderWhatsappNotification: vi.fn(),
}))

import * as cancelRoute from '@/app/api/public/orders/[id]/cancel/route'
import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

const { createAdminClient } = await import('@/lib/supabase/admin')
const { refundOrderIfNeeded } = await import('@/lib/order-refunds')
const { sendOrderWhatsappNotification } = await import('@/lib/order-whatsapp')

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

    const response = await cancelRoute.cancelPublicOrder(
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
            payment_method: 'delivery',
            delivery_status: 'waiting_dispatch',
            cancelled_reason: 'Cliente desistiu',
            refunded_at: '2026-03-20T12:00:00.000Z',
            created_at: '2026-03-20T10:00:00.000Z',
            updated_at: '2026-03-20T12:00:00.000Z',
          },
          error: null,
        }
      },
    })

    const response = await cancelRoute.cancelPublicOrder(
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
    expect(await response.json()).toEqual({
      data: expect.objectContaining({
        status: 'cancelled',
        payment_method: 'delivery',
        delivery_status: 'waiting_dispatch',
        cancelled_reason: 'Cliente desistiu',
      }),
    })
  })

  it('cancelPublicOrder devolve 404 quando pedido não existe', async () => {
    const admin = createMockSupabaseClient({
      orders: () => ({
        data: null,
        error: new Error('missing'),
      }),
    })

    const response = await cancelRoute.cancelPublicOrder(
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

    const response = await cancelRoute.cancelPublicOrder(
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

    const response = await cancelRoute.cancelPublicOrder(
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

  it('cancelPublicOrder retorna mensagem padrão quando o update falha com erro não-Error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-1', status: 'pending' },
            error: null,
          }
        }

        if (state.operation === 'update') {
          return {
            data: null,
            error: { code: 'update-failed' },
          }
        }

        throw new Error('Nenhuma outra query deveria ser executada')
      },
    })

    const response = await cancelRoute.cancelPublicOrder(
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
      error: 'Erro ao cancelar pedido.',
    })
    expect(errorSpy).toHaveBeenLastCalledWith(
      '[public-orders:cancel]',
      { code: 'update-failed' },
    )
    errorSpy.mockRestore()
  })

  it('cancelPublicOrder propaga erro de reembolso e não tenta enviar whatsapp', async () => {
    let notified = false

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-1', status: 'confirmed' },
            error: null,
          }
        }

        if (state.operation === 'update') {
          return { data: null, error: null }
        }

        throw new Error('Nenhuma outra query deveria ser executada')
      },
    })

    const response = await cancelRoute.cancelPublicOrder(
      {
        json: async () => ({}),
      },
      'order-1',
      {
        createAdminClient: () => admin as never,
        refundOrderIfNeeded: async () => {
          throw new Error('refund failed')
        },
        sendOrderWhatsappNotification: async () => {
          notified = true
          return { sent: true }
        },
      }
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'refund failed',
    })
    expect(notified).toBe(false)
  })

  it('cancelPublicOrder ignora falha no whatsapp e ainda devolve o pedido atualizado', async () => {
    const whatsappErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-2', status: 'confirmed' },
            error: null,
          }
        }

        if (state.operation === 'update') {
          return { data: null, error: null }
        }

        return {
          data: {
            id: 'order-2',
            order_number: 88,
            status: 'cancelled',
            payment_status: 'paid',
            payment_method: 'counter',
            delivery_status: null,
            cancelled_reason: 'Cancelado pelo cliente',
            refunded_at: null,
            created_at: '2026-03-20T10:00:00.000Z',
            updated_at: '2026-03-20T12:00:00.000Z',
          },
          error: null,
        }
      },
    })

    const response = await cancelRoute.cancelPublicOrder(
      {
        json: async () => ({}),
      },
      'order-2',
      {
        createAdminClient: () => admin as never,
        refundOrderIfNeeded: async () => ({ refunded: false }),
        sendOrderWhatsappNotification: async () => {
          throw new Error('whatsapp failed')
        },
      }
    )

    expect(response.status).toBe(200)
    expect((await response.json()).data.id).toBe('order-2')
    expect(whatsappErrorSpy).toHaveBeenLastCalledWith(
      '[order-whatsapp:public-cancel]',
      expect.any(Error),
    )
    whatsappErrorSpy.mockRestore()
  })

  it('POST repassa o id para cancelPublicOrder com as dependências padrão', async () => {
    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status') {
          return {
            data: { id: 'order-post-1', status: 'pending' },
            error: null,
          }
        }

        if (state.operation === 'update') {
          return { data: null, error: null }
        }

        return {
          data: {
            id: 'order-post-1',
            order_number: 55,
            status: 'cancelled',
            payment_status: 'pending',
            payment_method: 'table',
            delivery_status: null,
            cancelled_reason: 'Cancelado pelo cliente',
            refunded_at: null,
            created_at: '2026-03-20T10:00:00.000Z',
            updated_at: '2026-03-20T12:00:00.000Z',
          },
          error: null,
        }
      },
    })

    vi.mocked(createAdminClient).mockReturnValue(admin as never)
    vi.mocked(refundOrderIfNeeded).mockResolvedValue({ refunded: false } as never)
    vi.mocked(sendOrderWhatsappNotification).mockResolvedValue({ sent: false } as never)

    const request = {
      json: async () => ({}),
    } as never

    const response = await cancelRoute.POST(
      request,
      { params: Promise.resolve({ id: 'order-post-1' }) },
    )

    expect(response.status).toBe(200)
    expect(vi.mocked(refundOrderIfNeeded)).toHaveBeenCalledWith('order-post-1')
    expect(vi.mocked(sendOrderWhatsappNotification)).toHaveBeenCalledWith({
      orderId: 'order-post-1',
      eventKey: 'order_cancelled',
    })
  })
})
