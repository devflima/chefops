import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/saas-billing', () => ({
  ensureTenantBillingAccessState: vi.fn(),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const { ensureTenantBillingAccessState } = await import('@/lib/saas-billing')
const publicOrdersRoute = await import('@/app/api/public/orders/route')

describe('api public orders route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ensureTenantBillingAccessState).mockResolvedValue({ downgraded: false } as never)
  })

  it('cria pedido público de delivery sem autenticação de dashboard', async () => {
    const insertOrder = vi.fn()
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

        if (table === 'tenant_delivery_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { delivery_enabled: true, flat_fee: 8, accepting_orders: true },
              error: null,
            }),
          }
        }

        if (table === 'orders') {
          return {
            insert: insertOrder.mockImplementation(() => orderInsertQuery),
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
    expect(insertOrder).toHaveBeenCalledWith(expect.objectContaining({
      payment_method: 'delivery',
      payment_status: 'pending',
      delivery_status: 'waiting_dispatch',
    }))
  })

  it('bloqueia pedidos públicos quando o billing efetivo rebaixa o tenant para free e o limite mensal já foi atingido', async () => {
    vi.mocked(ensureTenantBillingAccessState).mockResolvedValueOnce({ downgraded: true } as never)
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'basic' } }),
          }
        }

        if (table === 'tenant_delivery_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { delivery_enabled: true, flat_fee: 8, accepting_orders: true },
              error: null,
            }),
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


  it('bloqueia pedidos públicos quando o estabelecimento está fechado para novos pedidos', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'basic' } }),
          }
        }

        if (table === 'tenant_delivery_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { delivery_enabled: true, flat_fee: 8, accepting_orders: false },
              error: null,
            }),
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

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: 'O estabelecimento está fechado para novos pedidos no momento.',
    })
  })


  it('bloqueia pedidos públicos fora do horário de funcionamento configurado', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T23:30:00.000Z'))

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'basic' } }),
          }
        }

        if (table === 'tenant_delivery_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                delivery_enabled: true,
                flat_fee: 8,
                accepting_orders: true,
                schedule_enabled: true,
                opens_at: '09:00',
                closes_at: '18:00',
              },
              error: null,
            }),
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

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: 'O estabelecimento está fechado para novos pedidos no momento.',
    })

    vi.useRealTimers()
  })

})
