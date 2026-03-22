import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-guards', () => ({
  requireTenantRoles: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/order-refunds', () => ({
  refundOrderIfNeeded: vi.fn(),
}))

vi.mock('@/lib/order-whatsapp', () => ({
  sendOrderWhatsappNotification: vi.fn(),
}))

vi.mock('@/lib/stock-deduction', () => ({
  deductOrderStockIfNeeded: vi.fn(),
}))

vi.mock('@/lib/mercadopago', () => ({
  createCheckoutPreference: vi.fn(),
  getMercadoPagoWebhookUrl: vi.fn(() => 'https://chefops.test/webhook'),
}))

vi.mock('@/lib/tenant-mercadopago', () => ({
  getTenantMercadoPagoAccessToken: vi.fn(),
  getTenantMercadoPagoAccount: vi.fn(),
}))

vi.mock('@/lib/checkout-session', () => ({
  createOrderFromCheckoutSession: vi.fn(),
}))

const { requireTenantRoles } = await import('@/lib/auth-guards')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { refundOrderIfNeeded } = await import('@/lib/order-refunds')
const { sendOrderWhatsappNotification } = await import('@/lib/order-whatsapp')
const { deductOrderStockIfNeeded } = await import('@/lib/stock-deduction')
const { createCheckoutPreference, getMercadoPagoWebhookUrl } = await import('@/lib/mercadopago')
const { getTenantMercadoPagoAccessToken, getTenantMercadoPagoAccount } = await import('@/lib/tenant-mercadopago')
const { createOrderFromCheckoutSession } = await import('@/lib/checkout-session')

const ordersRoute = await import('@/app/api/orders/route')
const orderByIdRoute = await import('@/app/api/orders/[id]/route')
const orderMercadoPagoRoute = await import('@/app/api/orders/[id]/mercado-pago/route')
const publicCheckoutByIdRoute = await import('@/app/api/public/checkout/[id]/route')
const publicCheckoutMercadoPagoRoute = await import('@/app/api/public/checkout/mercado-pago/route')

function forbiddenResponse(status = 403) {
  return new Response(JSON.stringify({ error: 'forbidden' }), { status })
}

describe('api orders and checkout routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('orders GET/POST cobrem auth, filtros, validacao, mismatch, limite e sucesso', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await ordersRoute.GET(
      new Request('https://chefops.test/api/orders') as never,
    )).status).toBe(403)

    const ordersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [{ id: 'order-1' }], error: null, count: 1 }),
    }
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ordersQuery),
      },
    } as never)
    expect((await ordersRoute.GET(
      new Request('https://chefops.test/api/orders?status=pending&from=2026-03-01&to=2026-03-31&page=2&pageSize=10') as never,
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: null, error: new Error('boom'), count: 0 }),
        })),
      },
    } as never)
    expect((await ordersRoute.GET(
      new Request('https://chefops.test/api/orders?page=1&pageSize=20') as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: 'bad-id', items: [] }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'counter',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
          }],
        }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: '550e8400-e29b-41d4-a716-446655440000' },
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'counter',
          table_id: '550e8400-e29b-41d4-a716-446655440001',
          tab_id: '550e8400-e29b-41d4-a716-446655440002',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
          }],
        }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: '550e8400-e29b-41d4-a716-446655440000' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'free' } }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ count: 50 }),
        }
      }),
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'counter',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
          }],
        }),
      }) as never,
    )).status).toBe(429)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: '550e8400-e29b-41d4-a716-446655440000' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' } }),
          }
        }
        if (table === 'table_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null }),
            })),
          }
        }

        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'table',
          table_id: '550e8400-e29b-41d4-a716-446655440001',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
          }],
        }),
      }) as never,
    )).status).toBe(422)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: '550e8400-e29b-41d4-a716-446655440000' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' } }),
          }
        }
        if (table === 'tabs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'tab-1', status: 'closed' } }),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'counter',
          tab_id: '550e8400-e29b-41d4-a716-446655440002',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
          }],
        }),
      }) as never,
    )).status).toBe(422)

    const failingOrderInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') }),
    }
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: '550e8400-e29b-41d4-a716-446655440000' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' } }),
          }
        }
        if (table === 'orders') {
          return {
            insert: vi.fn(() => failingOrderInsertQuery),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'counter',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
          }],
        }),
      }) as never,
    )).status).toBe(500)

    const orderInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null }),
    }
    const orderItemsInsertQuery = {
      select: vi.fn().mockResolvedValue({ data: [{ id: 'item-1' }], error: null }),
    }
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: '550e8400-e29b-41d4-a716-446655440000' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { plan: 'pro' } }),
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

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          payment_method: 'delivery',
          customer_name: 'Carlos',
          delivery_fee: 5,
          delivery_address: { street: 'Rua A' },
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
            extras: [{ name: 'Bacon', price: 2 }],
          }],
        }),
      }) as never,
    )).status).toBe(201)
  })

  it('order por id GET/PATCH cobrem 404, validacao, motorista invalido, refund, estoque e notificacoes', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await orderByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
        })),
      },
    } as never)
    expect((await orderByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockRejectedValue(new Error('get failed')),
        })),
      },
    } as never)
    expect((await orderByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-1',
              tenant_id: 'tenant-1',
              status: 'pending',
              payment_status: 'pending',
              payment_method: 'counter',
              delivery_status: null,
              delivery_driver: null,
              items: [],
              notifications: [],
            },
            error: null,
          }),
        })),
      },
    } as never)
    expect((await orderByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      user: { id: 'user-1' },
      supabase: {},
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'bad' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'order-1',
                  tenant_id: 'tenant-1',
                  status: 'pending',
                  payment_status: 'pending',
                  payment_method: 'delivery',
                  delivery_status: 'waiting_dispatch',
                  delivery_driver_id: null,
                  delivery_address: { street: 'Rua A' },
                },
                error: null,
              }),
            }
          }

          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }
        }),
      },
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          delivery_driver_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(422)

    vi.mocked(deductOrderStockIfNeeded).mockResolvedValueOnce({ deducted: true } as never)
    vi.mocked(sendOrderWhatsappNotification).mockResolvedValue(undefined as never)
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'order-1',
                  tenant_id: 'tenant-1',
                  status: 'pending',
                  payment_status: 'pending',
                  payment_method: 'delivery',
                  delivery_status: 'waiting_dispatch',
                  delivery_driver_id: null,
                  delivery_address: { street: 'Rua A' },
                },
                error: null,
              }),
            }
          }

          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'driver-1' } }),
          }
        }),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'order-1', status: 'confirmed', delivery_status: 'out_for_delivery' },
            error: null,
          }),
        })),
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'confirmed',
          delivery_driver_id: '550e8400-e29b-41d4-a716-446655440000',
          delivery_status: 'out_for_delivery',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
    expect(sendOrderWhatsappNotification).toHaveBeenCalledTimes(2)

    vi.mocked(refundOrderIfNeeded).mockResolvedValueOnce(undefined as never)
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-1',
              tenant_id: 'tenant-1',
              status: 'confirmed',
              payment_status: 'paid',
              payment_method: 'counter',
              delivery_status: null,
              delivery_driver_id: null,
              delivery_address: null,
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'order-1', status: 'cancelled', payment_status: 'paid' },
            error: null,
          }),
        })),
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
    expect(refundOrderIfNeeded).toHaveBeenCalledWith('order-1')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-1',
              tenant_id: 'tenant-1',
              status: 'confirmed',
              payment_status: 'pending',
              payment_method: 'counter',
              delivery_status: null,
              delivery_driver_id: null,
              delivery_address: null,
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') }),
        })),
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ready' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockRejectedValue(new Error('order failed')),
        })),
      },
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmed' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(500)
  })

  it('pedido mercado pago POST cobre 404, pago, sem itens, sem token e sucesso', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
        })),
      },
    } as never)
    expect((await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'order-1', tenant_id: 'tenant-1', payment_status: 'paid', items: [{ name: 'Burger', quantity: 1, price: 10 }] },
            error: null,
          }),
        })),
      },
    } as never)
    expect((await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(409)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'order-1', tenant_id: 'tenant-1', payment_status: 'pending', items: [] },
            error: null,
          }),
        })),
      },
    } as never)
    expect((await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(422)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-1',
              tenant_id: 'tenant-1',
              order_number: 10,
              customer_name: 'Carlos',
              payment_status: 'pending',
              items: [{ name: 'Burger', quantity: 1, price: 10 }],
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce(null as never)
    expect((await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(409)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-1',
              tenant_id: 'tenant-1',
              order_number: 10,
              customer_name: 'Carlos',
              payment_status: 'pending',
              items: [{ name: 'Burger', quantity: 1, price: 10 }],
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-1' as never)
    vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
      id: 'pref-1',
      init_point: 'https://mp.test/live',
      sandbox_init_point: 'https://mp.test/sandbox',
    } as never)
    expect((await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
  })

  it('public checkout GET e mercado pago POST cobrem 404, auto conversao, validacao, sem token e sucesso', async () => {
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
      })),
    } as never)
    expect((await publicCheckoutByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'chk-1' }) },
    )).status).toBe(404)

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: {
              id: 'chk-1',
              status: 'approved',
              payload: { items: [] },
              mercado_pago_payment_id: 'pay-1',
              created_order_id: null,
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              id: 'chk-1',
              status: 'approved',
              created_order_id: 'order-1',
              created_order: { id: 'order-1', order_number: 99, status: 'confirmed', payment_status: 'paid' },
            },
            error: null,
          }),
      })),
    } as never)
    expect((await publicCheckoutByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'chk-1' }) },
    )).status).toBe(200)
    expect(createOrderFromCheckoutSession).toHaveBeenCalledWith({
      checkoutSessionId: 'chk-1',
      payload: { items: [] },
      paymentId: 'pay-1',
    })

    expect((await publicCheckoutMercadoPagoRoute.POST(
      new Request('https://chefops.test/api/public/checkout/mercado-pago', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: 'bad-id' }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce(null as never)
    expect((await publicCheckoutMercadoPagoRoute.POST(
      new Request('https://chefops.test/api/public/checkout/mercado-pago', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          tenant_slug: 'resto',
          customer_name: 'Carlos',
          items: [{
            menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Burger',
            price: 10,
            quantity: 1,
          }],
        }),
      }) as never,
    )).status).toBe(409)

    const originalUrl = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'
    try {
      const sessionInsertQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'chk-1' }, error: null }),
      }
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => sessionInsertQuery),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      } as never)
      vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
      vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-1' as never)
      vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
        id: 'pref-1',
        init_point: 'https://mp.test/live',
        sandbox_init_point: 'https://mp.test/sandbox',
      } as never)

      const response = await publicCheckoutMercadoPagoRoute.POST(
        new Request('https://chefops.test/api/public/checkout/mercado-pago', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            tenant_slug: 'resto',
            customer_name: 'Carlos',
            delivery_fee: 5,
            items: [{
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Burger',
              price: 10,
              quantity: 1,
              extras: [{ name: 'Bacon', price: 2 }],
            }],
          }),
        }) as never,
      )

      expect(response.status).toBe(200)
      expect(getMercadoPagoWebhookUrl).toHaveBeenCalled()
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = originalUrl
    }
  })
})
