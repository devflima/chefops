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

  it('segue sem table_session_id quando a nova sessão não é criada', async () => {
    let tableStatusUpdate: Record<string, unknown> | undefined

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        table_sessions: (state) => {
          if (state.operation === 'select') {
            return { data: null, error: null }
          }

          return {
            data: null,
            error: null,
          }
        },
        tables: (state) => {
          tableStatusUpdate = state.values
          return { data: null, error: null }
        },
        orders: (state) => ({
          data: {
            id: 'order-no-session',
            ...(state.rows?.[0] ?? {}),
          },
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

    const order = await createOrderFromCheckoutSession({
      checkoutSessionId: 'checkout-no-session',
      payload: {
        tenant_id: 'tenant-1',
        customer_name: 'Mesa 5',
        table_id: 'table-5',
        table_number: '5',
        items: [
          {
            menu_item_id: 'menu-1',
            name: 'Pizza',
            price: 25,
            quantity: 1,
          },
        ],
      },
    })

    expect(order).toMatchObject({
      id: 'order-no-session',
      table_session_id: null,
    })
    expect(tableStatusUpdate).toBeUndefined()
  })

  it('cria pedido sem mesa, sem extras e ignora falha do WhatsApp', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(sendOrderWhatsappNotification).mockRejectedValueOnce(new Error('twilio down'))

    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        orders: (state) => ({
          data: {
            id: 'order-no-table',
            ...(state.rows?.[0] ?? {}),
          },
          error: null,
        }),
        order_items: () => ({
          data: [{ id: 'item-no-extra' }],
          error: null,
        }),
        checkout_sessions: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    const order = await createOrderFromCheckoutSession({
      checkoutSessionId: 'checkout-no-table',
      payload: {
        tenant_id: 'tenant-1',
        customer_name: 'Delivery',
        customer_phone: '+5511999999999',
        notes: 'Sem cebola',
        delivery_address: {
          zip_code: '12345-678',
          street: 'Rua A',
          number: '10',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
        },
        items: [
          {
            menu_item_id: 'menu-1',
            name: 'Pizza',
            price: 40,
            quantity: 1,
            notes: 'Bem assada',
          },
        ],
      },
    })

    expect(order).toMatchObject({
      id: 'order-no-table',
      delivery_status: 'waiting_dispatch',
      payment_provider: null,
      payment_transaction_id: null,
      table_session_id: null,
    })
    expect(sendOrderWhatsappNotification).toHaveBeenCalledWith({
      orderId: 'order-no-table',
      eventKey: 'order_received',
    })
    expect(consoleError).toHaveBeenCalledWith(
      '[order-whatsapp:received]',
      expect.any(Error)
    )
  })

  it('propaga erro ao criar pedido quando insert falha', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      createMockSupabaseClient({
        orders: () => ({
          data: null,
          error: new Error('insert failed'),
        }),
      }) as never
    )

    await expect(
      createOrderFromCheckoutSession({
        checkoutSessionId: 'checkout-error',
        payload: {
          tenant_id: 'tenant-1',
          customer_name: 'Felipe',
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
    ).rejects.toThrow('insert failed')

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        orders: () => ({
          data: null,
          error: null,
        }),
      }) as never
    )

    await expect(
      createOrderFromCheckoutSession({
        checkoutSessionId: 'checkout-order-null',
        payload: {
          tenant_id: 'tenant-1',
          customer_name: 'Felipe',
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
    ).rejects.toThrow('Erro ao criar pedido a partir do checkout.')
  })

  it('propaga erro ao inserir extras e ao atualizar checkout', async () => {
    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        orders: () => ({
          data: { id: 'order-items-error' },
          error: null,
        }),
        order_items: () => ({
          data: null,
          error: new Error('items failed'),
        }),
      }) as never
    )

    await expect(
      createOrderFromCheckoutSession({
        checkoutSessionId: 'checkout-items-error',
        payload: {
          tenant_id: 'tenant-1',
          customer_name: 'Felipe',
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
    ).rejects.toThrow('items failed')

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        orders: () => ({
          data: { id: 'order-extras-error' },
          error: null,
        }),
        order_items: () => ({
          data: [{ id: 'item-1' }],
          error: null,
        }),
        order_item_extras: () => ({
          data: null,
          error: new Error('extras failed'),
        }),
      }) as never
    )

    await expect(
      createOrderFromCheckoutSession({
        checkoutSessionId: 'checkout-extras-error',
        payload: {
          tenant_id: 'tenant-1',
          customer_name: 'Felipe',
          items: [
            {
              menu_item_id: 'menu-1',
              name: 'Pizza',
              price: 20,
              quantity: 1,
              extras: [{ name: 'Borda', price: 4 }],
            },
          ],
        },
      })
    ).rejects.toThrow('extras failed')

    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        orders: () => ({
          data: { id: 'order-checkout-error' },
          error: null,
        }),
        order_items: () => ({
          data: [{ id: 'item-1' }],
          error: null,
        }),
        checkout_sessions: () => ({
          data: null,
          error: new Error('checkout update failed'),
        }),
      }) as never
    )

    await expect(
      createOrderFromCheckoutSession({
        checkoutSessionId: 'checkout-update-error',
        payload: {
          tenant_id: 'tenant-1',
          customer_name: 'Felipe',
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
    ).rejects.toThrow('checkout update failed')
  })
})
