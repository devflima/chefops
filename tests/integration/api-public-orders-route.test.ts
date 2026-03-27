import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const publicOrdersRoute = await import('@/app/api/public/orders/route')

describe('api public orders route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cria pedido público de delivery sem autenticação de dashboard', async () => {
    const orderInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'order-1',
          order_number: 101,
          status: 'pending',
          payment_status: 'pending',
          created_at: '2026-03-26T00:00:00.000Z',
          updated_at: '2026-03-26T00:00:00.000Z',
        },
        error: null,
      }),
    }

    const orderItemsInsertQuery = {
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'order-item-1' }],
        error: null,
      }),
    }

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'basic' } }),
          }
        }

        if (table === 'orders') {
          return {
            insert: vi.fn(() => orderInsertQuery),
          }
        }

        if (table === 'order_items') {
          return {
            insert: vi.fn(() => orderItemsInsertQuery),
          }
        }

        if (table === 'order_item_extras') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    } as never)

    const response = await publicOrdersRoute.POST(
      new Request('https://chefops.test/api/public/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          customer_name: 'Maria',
          customer_phone: '11999999999',
          payment_method: 'delivery',
          delivery_fee: 8,
          delivery_address: {
            zip_code: '12345-678',
            street: 'Rua A',
            number: '10',
            city: 'São Paulo',
            state: 'SP',
            label: 'Casa',
            is_default: false,
          },
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Pizza Margherita',
            price: 32,
            quantity: 1,
          }],
        }),
      }) as never,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: 'order-1',
        order_number: 101,
        status: 'pending',
      },
    })
  })

  it('bloqueia pedidos públicos quando o plano basic atinge o limite mensal', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'free' } }),
          }
        }

        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockResolvedValue({ count: 50 }),
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    } as never)

    const response = await publicOrdersRoute.POST(
      new Request('https://chefops.test/api/public/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          customer_name: 'Maria',
          customer_phone: '11999999999',
          payment_method: 'delivery',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Pizza Margherita',
            price: 32,
            quantity: 1,
          }],
        }),
      }) as never,
    )

    expect(response.status).toBe(429)
  })
})
