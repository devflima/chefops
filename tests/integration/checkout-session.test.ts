import { describe, expect, it, vi } from 'vitest'

import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/order-whatsapp', () => ({
  sendOrderWhatsappNotification: vi.fn().mockResolvedValue({ sent: true }),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const { sendOrderWhatsappNotification } = await import('@/lib/order-whatsapp')
const { createOrderFromCheckoutSession } = await import('@/lib/checkout-session')

describe('checkout session', () => {
  it('cria pedido convertido, itens, extras e atualiza checkout', async () => {
    let checkoutUpdate: Record<string, unknown> | undefined
    let createdOrderRow: Record<string, unknown> | undefined
    let createdOrderItems: unknown[] | undefined
    let createdExtras: unknown[] | undefined

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        table_sessions: () => ({
          data: { id: 'session-1' },
          error: null,
        }),
        orders: (state) => {
          createdOrderRow = state.rows?.[0] as Record<string, unknown>
          return {
            data: {
              id: 'order-1',
            },
            error: null,
          }
        },
        order_items: (state) => {
          createdOrderItems = state.rows
          return {
            data: [{ id: 'item-1' }, { id: 'item-2' }],
            error: null,
          }
        },
        order_item_extras: (state) => {
          createdExtras = state.rows
          return { data: null, error: null }
        },
        checkout_sessions: (state) => {
          checkoutUpdate = state.values
          return { data: null, error: null }
        },
      }) as never
    )

    const order = await createOrderFromCheckoutSession({
      checkoutSessionId: 'checkout-1',
      paymentId: 'payment-1',
      payload: {
        tenant_id: 'tenant-1',
        customer_name: 'Felipe',
        customer_phone: '+5511999999999',
        table_id: 'table-1',
        table_number: '12',
        delivery_fee: 5,
        items: [
          {
            menu_item_id: 'menu-1',
            name: 'Pizza',
            price: 30,
            quantity: 2,
            extras: [{ name: 'Borda', price: 4 }],
          },
          {
            menu_item_id: 'menu-2',
            name: 'Refri',
            price: 8,
            quantity: 1,
          },
        ],
      },
    })

    expect(order).toEqual({ id: 'order-1' })
    expect(createdOrderRow).toMatchObject({
      tenant_id: 'tenant-1',
      customer_name: 'Felipe',
      payment_status: 'paid',
      payment_provider: 'mercado_pago',
      payment_transaction_id: 'payment-1',
      subtotal: 76,
      delivery_fee: 5,
      total: 81,
      table_session_id: 'session-1',
    })
    expect(createdOrderItems).toEqual([
      {
        order_id: 'order-1',
        menu_item_id: 'menu-1',
        name: 'Pizza',
        price: 30,
        quantity: 2,
        notes: null,
      },
      {
        order_id: 'order-1',
        menu_item_id: 'menu-2',
        name: 'Refri',
        price: 8,
        quantity: 1,
        notes: null,
      },
    ])
    expect(createdExtras).toEqual([
      {
        order_item_id: 'item-1',
        name: 'Borda',
        price: 4,
      },
    ])
    expect(checkoutUpdate).toMatchObject({
      status: 'converted',
      created_order_id: 'order-1',
    })
    expect(sendOrderWhatsappNotification).toHaveBeenCalledWith({
      orderId: 'order-1',
      eventKey: 'order_received',
    })
  })

  it('abre nova sessao de mesa quando nao existe uma aberta', async () => {
    let tableStatusUpdate: Record<string, unknown> | undefined

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        table_sessions: (state) => {
          if (state.operation === 'select') {
            return { data: null, error: null }
          }

          return {
            data: { id: 'new-session-1' },
            error: null,
          }
        },
        tables: (state) => {
          tableStatusUpdate = state.values
          return { data: null, error: null }
        },
        orders: () => ({
          data: { id: 'order-2' },
          error: null,
        }),
        order_items: () => ({
          data: [{ id: 'item-1' }],
          error: null,
        }),
        checkout_sessions: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await createOrderFromCheckoutSession({
      checkoutSessionId: 'checkout-2',
      payload: {
        tenant_id: 'tenant-1',
        customer_name: 'Mesa 3',
        table_id: 'table-3',
        items: [
          {
            menu_item_id: 'menu-1',
            name: 'Pizza',
            price: 20,
            quantity: 1,
          },
        ],
      },
    })

    expect(tableStatusUpdate).toEqual({ status: 'occupied' })
  })
})
