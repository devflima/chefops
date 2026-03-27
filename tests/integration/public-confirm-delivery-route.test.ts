import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/order-whatsapp', () => ({
  sendOrderWhatsappNotification: vi.fn(),
}))

import * as confirmRoute from '@/app/api/public/orders/[id]/confirm-delivery/route'
import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

describe('public confirm delivery route', () => {
  it('rejeita confirmação quando o pedido ainda não saiu para entrega', async () => {
    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select' && state.columns === 'id, status, payment_method, delivery_status') {
          return {
            data: {
              id: 'order-1',
              status: 'ready',
              payment_method: 'delivery',
              delivery_status: 'waiting_dispatch',
            },
            error: null,
          }
        }

        throw new Error('Nenhuma outra query deveria ser executada')
      },
    })

    const response = await confirmRoute.confirmPublicOrderDelivery(
      'order-1',
      {
        createAdminClient: () => admin as never,
        sendOrderWhatsappNotification: async () => ({ sent: false }),
      },
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: 'Este pedido ainda não pode ser confirmado como entregue.',
    })
  })

  it('confirma entrega pública e devolve pedido atualizado', async () => {
    let updateValues: Record<string, unknown> | undefined
    let notifiedOrderId: string | undefined
    let updated = false

    const admin = createMockSupabaseClient({
      orders: (state) => {
        if (state.operation === 'select') {
          if (updated) {
            return {
              data: {
                id: 'order-1',
                order_number: 88,
                status: 'delivered',
                payment_status: 'pending',
                payment_method: 'delivery',
                delivery_status: 'delivered',
                created_at: '2026-03-26T10:00:00.000Z',
                updated_at: '2026-03-26T10:20:00.000Z',
              },
              error: null,
            }
          }

          return {
            data: {
              id: 'order-1',
              status: 'ready',
              payment_method: 'delivery',
              delivery_status: 'out_for_delivery',
            },
            error: null,
          }
        }

        if (state.operation === 'update') {
          updateValues = state.values
          updated = true
          return { data: null, error: null }
        }

        throw new Error('Nenhuma outra query deveria ser executada')
      },
    })

    const response = await confirmRoute.confirmPublicOrderDelivery(
      'order-1',
      {
        createAdminClient: () => admin as never,
        sendOrderWhatsappNotification: async ({ orderId }) => {
          notifiedOrderId = orderId
          return { sent: true }
        },
      },
    )

    expect(response.status).toBe(200)
    expect(updateValues).toEqual({
      status: 'delivered',
      delivery_status: 'delivered',
    })
    expect(notifiedOrderId).toBe('order-1')
    expect((await response.json()).data.status).toBe('delivered')
  })
})
