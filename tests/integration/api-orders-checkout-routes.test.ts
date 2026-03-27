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
          range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        })),
      },
    } as never)
    const defaultGetResponse = await ordersRoute.GET(
      new Request('https://chefops.test/api/orders') as never,
    )
    expect(defaultGetResponse.status).toBe(200)
    await expect(defaultGetResponse.json()).resolves.toMatchObject({
      data: [],
      count: 0,
      page: 1,
      pageSize: 20,
    })

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
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await ordersRoute.POST(
      new Request('https://chefops.test/api/orders', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: 'bad-id', items: [] }),
      }) as never,
    )).status).toBe(403)

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

    const freePlanOrderInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'order-free-1' }, error: null }),
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
            single: vi.fn().mockResolvedValue({ data: { plan: 'free' } }),
          }
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockResolvedValue({ count: null }),
            insert: vi.fn(() => freePlanOrderInsertQuery),
          }
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'item-free-1' }], error: null }),
            })),
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
    )).status).toBe(201)

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

    const insertOrder = vi.fn()
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
            insert: insertOrder.mockImplementation(() => orderInsertQuery),
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
    expect(insertOrder).toHaveBeenCalledWith(expect.objectContaining({
      payment_method: 'delivery',
      payment_status: 'pending',
      delivery_status: 'waiting_dispatch',
    }))

    const orderInsertForItemsError = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'order-items-error-1' }, error: null }),
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
            insert: vi.fn(() => orderInsertForItemsError),
          }
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({ data: null, error: new Error('items failed') }),
            })),
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

    const orderInsertForExtrasError = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'order-extras-error-1' }, error: null }),
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
            insert: vi.fn(() => orderInsertForExtrasError),
          }
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'item-extra-1' }], error: null }),
            })),
          }
        }
        if (table === 'order_item_extras') {
          return {
            insert: vi.fn().mockResolvedValue({ error: new Error('extras failed') }),
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
    )).status).toBe(500)

    const createdSessionInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'session-1' } }),
    }
    const orderWithTableInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'order-table-1' }, error: null }),
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
        if (table === 'table_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
            insert: vi.fn(() => createdSessionInsertQuery),
          }
        }
        if (table === 'tables') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'orders') {
          return {
            insert: vi.fn(() => orderWithTableInsertQuery),
          }
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'item-table-1' }], error: null }),
            })),
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
    )).status).toBe(201)

    const existingSessionSelect = vi.fn().mockReturnThis()
    const existingSessionEq = vi.fn().mockReturnThis()
    const existingSessionSingle = vi.fn().mockResolvedValue({ data: { id: 'session-existing-1' } })
    const existingSessionInsert = vi.fn()
    const tablesUpdate = vi.fn()
    const orderWithExistingSessionInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'order-table-existing-1' }, error: null }),
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
        if (table === 'table_sessions') {
          return {
            select: existingSessionSelect,
            eq: existingSessionEq,
            single: existingSessionSingle,
            insert: existingSessionInsert,
          }
        }
        if (table === 'tables') {
          return {
            update: tablesUpdate,
            eq: vi.fn(),
          }
        }
        if (table === 'orders') {
          return {
            insert: vi.fn(() => orderWithExistingSessionInsertQuery),
          }
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'item-table-existing-1' }], error: null }),
            })),
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
    )).status).toBe(201)
    expect(existingSessionInsert).not.toHaveBeenCalled()
    expect(tablesUpdate).not.toHaveBeenCalled()

    const orderWithTabInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'order-tab-1' }, error: null }),
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
        if (table === 'tabs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'tab-open-1', status: 'open' } }),
          }
        }
        if (table === 'orders') {
          return {
            insert: vi.fn(() => orderWithTabInsertQuery),
          }
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({ data: [{ id: 'item-tab-1' }], error: null }),
            })),
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
      ok: false,
      response: forbiddenResponse(401),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmed' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(401)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      },
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmed' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(404)

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

    vi.mocked(deductOrderStockIfNeeded).mockResolvedValueOnce({ deducted: false } as never)
    vi.mocked(sendOrderWhatsappNotification).mockRejectedValueOnce(new Error('notify failed') as never)
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
              status: 'pending',
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
          single: vi.fn().mockResolvedValue({
            data: { id: 'order-1', status: 'confirmed', payment_status: 'pending' },
            error: null,
          }),
        })),
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmed' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)

    vi.mocked(sendOrderWhatsappNotification).mockRejectedValueOnce(new Error('notify delivery failed') as never)
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
                  status: 'confirmed',
                  payment_status: 'pending',
                  payment_method: 'delivery',
                  delivery_status: 'assigned',
                  delivery_driver_id: 'driver-1',
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
        body: JSON.stringify({ delivery_status: 'out_for_delivery' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)

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

    vi.mocked(sendOrderWhatsappNotification).mockClear()
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
                  status: 'confirmed',
                  payment_status: 'pending',
                  payment_method: 'counter',
                  delivery_status: null,
                  delivery_driver_id: null,
                  delivery_address: null,
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
    const nonDeliveryUpdate = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'order-1', status: 'pending', delivery_driver_id: null, delivery_status: null },
        error: null,
      }),
    }))
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: nonDeliveryUpdate,
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'pending',
          delivery_driver_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
    expect(nonDeliveryUpdate).toHaveBeenCalledWith({
      status: 'pending',
      delivery_driver_id: null,
    })
    expect(sendOrderWhatsappNotification).not.toHaveBeenCalled()

    vi.mocked(sendOrderWhatsappNotification).mockResolvedValueOnce(undefined as never)
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
              status: 'ready',
              payment_status: 'paid',
              payment_method: 'delivery',
              delivery_status: 'out_for_delivery',
              delivery_driver_id: 'driver-1',
              delivery_address: { street: 'Rua A' },
            },
            error: null,
          }),
        })),
      },
    } as never)
    const deliveredUpdate = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'order-1', status: 'delivered', delivery_status: 'delivered' },
        error: null,
      }),
    }))
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: deliveredUpdate,
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'delivered' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
    expect(deliveredUpdate).toHaveBeenCalledWith({
      status: 'delivered',
      delivery_status: 'delivered',
    })

    vi.mocked(deductOrderStockIfNeeded).mockClear()
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
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
                  payment_method: 'counter',
                  delivery_status: null,
                  delivery_driver_id: null,
                  delivery_address: null,
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
    const freePlanReadyUpdate = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'order-1', status: 'ready', payment_status: 'pending' },
        error: null,
      }),
    }))
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: freePlanReadyUpdate,
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ready' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
    expect(deductOrderStockIfNeeded).not.toHaveBeenCalled()

    vi.mocked(deductOrderStockIfNeeded).mockClear()
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
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
                  payment_method: 'counter',
                  delivery_status: null,
                  delivery_driver_id: null,
                  delivery_address: null,
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
    const noTenantPlanUpdate = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'order-1', status: 'ready', payment_status: 'pending' },
        error: null,
      }),
    }))
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: noTenantPlanUpdate,
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ready' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
    expect(deductOrderStockIfNeeded).not.toHaveBeenCalled()

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
                  status: 'confirmed',
                  payment_status: 'pending',
                  payment_method: 'delivery',
                  delivery_status: 'assigned',
                  delivery_driver_id: 'driver-1',
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
    const waitingDispatchUpdate = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'order-1', status: 'confirmed', delivery_status: 'waiting_dispatch', delivery_driver_id: null },
        error: null,
      }),
    }))
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        update: waitingDispatchUpdate,
      })),
    } as never)
    expect((await orderByIdRoute.PATCH(
      new Request('https://chefops.test/api/orders/order-1', {
        method: 'PATCH',
        body: JSON.stringify({ delivery_driver_id: null }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )).status).toBe(200)
    expect(waitingDispatchUpdate).toHaveBeenCalledWith({
      delivery_driver_id: null,
      delivery_status: 'waiting_dispatch',
    })

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
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await orderMercadoPagoRoute.POST(
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
    expect(createCheckoutPreference).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payer: { name: 'Carlos' },
      }),
    )

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-null-account',
              tenant_id: 'tenant-1',
              order_number: 10,
              customer_name: null,
              payment_status: 'pending',
              items: [{ name: 'Burger', quantity: 1, price: 10 }],
            },
            error: null,
          }),
        })),
      },
    } as never)
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce(null as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-null-account' as never)
    vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
      id: 'pref-null-account',
      init_point: 'https://mp.test/live-null-account',
      sandbox_init_point: 'https://mp.test/sandbox-null-account',
    } as never)
    const nullAccountResponse = await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-null-account' }) },
    )
    expect(nullAccountResponse.status).toBe(200)
    expect((await nullAccountResponse.json()).data.checkout_url).toBe('https://mp.test/sandbox-null-account')
    expect(createCheckoutPreference).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payer: { name: undefined },
      }),
    )
    expect(infoSpy).toHaveBeenLastCalledWith(
      '[orders:mercado-pago:preference-created]',
      expect.objectContaining({
        liveMode: null,
        hasSandboxUrl: true,
      }),
    )
    infoSpy.mockRestore()

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-2',
              tenant_id: 'tenant-1',
              order_number: 11,
              customer_name: 'Ana',
              payment_status: 'pending',
              items: [{ name: 'Pizza', quantity: 1, price: 30 }],
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: true } as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-live' as never)
    vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
      id: 'pref-2',
      init_point: 'https://mp.test/live-2',
      sandbox_init_point: 'https://mp.test/sandbox-2',
    } as never)
    const liveResponse = await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-2' }) },
    )
    expect(liveResponse.status).toBe(200)
    expect((await liveResponse.json()).data.checkout_url).toBe('https://mp.test/live-2')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-2b',
              tenant_id: 'tenant-1',
              order_number: 11,
              customer_name: 'Ana',
              payment_status: 'pending',
              items: [{ name: 'Pizza', quantity: 1, price: 30 }],
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-sandbox-fallback' as never)
    vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
      id: 'pref-2b',
      init_point: 'https://mp.test/live-fallback',
      sandbox_init_point: null,
    } as never)
    const sandboxFallbackResponse = await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-2b' }) },
    )
    expect(sandboxFallbackResponse.status).toBe(200)
    expect((await sandboxFallbackResponse.json()).data.checkout_url).toBe('https://mp.test/live-fallback')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-3',
              tenant_id: 'tenant-1',
              order_number: 12,
              customer_name: 'Bia',
              payment_status: 'pending',
              items: [{ name: 'Suco', quantity: 1, price: 8 }],
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-err' as never)
    vi.mocked(createCheckoutPreference).mockRejectedValueOnce('boom' as never)
    const failedPreference = await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-3' }) },
    )
    expect(failedPreference.status).toBe(500)
    expect((await failedPreference.json()).error).toBe('Erro ao criar cobrança no Mercado Pago.')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'order-4',
              tenant_id: 'tenant-1',
              order_number: 13,
              customer_name: 'Joao',
              payment_status: 'pending',
              items: [{ name: 'Cafe', quantity: 1, price: 5 }],
            },
            error: null,
          }),
        })),
      },
    } as never)
    vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-error-instance' as never)
    vi.mocked(createCheckoutPreference).mockRejectedValueOnce(new Error('mp error'))
    const failedPreferenceWithError = await orderMercadoPagoRoute.POST(
      {} as never,
      { params: Promise.resolve({ id: 'order-4' }) },
    )
    expect(failedPreferenceWithError.status).toBe(500)
    expect((await failedPreferenceWithError.json()).error).toBe('mp error')
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

    const arrayCheckoutSingleMock = vi.fn()
      .mockResolvedValueOnce({
        data: {
          id: 'chk-1b',
          status: 'approved',
          payload: null,
          mercado_pago_payment_id: null,
          created_order_id: 'order-1b',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'chk-1b',
          status: 'approved',
          created_order_id: 'order-1b',
          created_order: [
            { id: 'order-1b', order_number: 101, status: 'confirmed', payment_status: 'paid' },
          ],
        },
        error: null,
      })
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: arrayCheckoutSingleMock,
      })),
    } as never)

    const arrayOrderResponse = await publicCheckoutByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'chk-1b' }) },
    )

    expect(arrayOrderResponse.status).toBe(200)
    expect(await arrayOrderResponse.json()).toEqual({
      data: {
        id: 'chk-1b',
        status: 'approved',
        created_order_id: 'order-1b',
        order_number: 101,
        order_status: 'confirmed',
        payment_status: 'paid',
      },
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(createOrderFromCheckoutSession).mockRejectedValueOnce(new Error('conversion failed'))
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: {
              id: 'chk-2',
              status: 'approved',
              payload: { items: [{ id: 'item-1' }] },
              mercado_pago_payment_id: 'pay-2',
              created_order_id: null,
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              id: 'chk-2',
              status: 'approved',
              created_order_id: null,
              created_order: [],
            },
            error: null,
          }),
      })),
    } as never)

    const conversionFailureResponse = await publicCheckoutByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'chk-2' }) },
    )

    expect(conversionFailureResponse.status).toBe(200)
    expect(await conversionFailureResponse.json()).toEqual({
      data: {
        id: 'chk-2',
        status: 'approved',
        created_order_id: null,
        order_number: null,
        order_status: null,
        payment_status: null,
      },
    })
    expect(warnSpy).toHaveBeenLastCalledWith(
      '[public-checkout:get:auto-convert]',
      {
        checkoutSessionId: 'chk-2',
        error: 'conversion failed',
      },
    )
    warnSpy.mockRestore()

    const warnObjectSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(createOrderFromCheckoutSession).mockRejectedValueOnce({ reason: 'raw failure' } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: {
              id: 'chk-2b',
              status: 'approved',
              payload: { items: [{ id: 'item-2' }] },
              mercado_pago_payment_id: 'pay-2b',
              created_order_id: null,
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              id: 'chk-2b',
              status: 'approved',
              created_order_id: 'order-2b',
              created_order: null,
            },
            error: null,
          }),
      })),
    } as never)

    const conversionObjectResponse = await publicCheckoutByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'chk-2b' }) },
    )

    expect(conversionObjectResponse.status).toBe(200)
    expect(await conversionObjectResponse.json()).toEqual({
      data: {
        id: 'chk-2b',
        status: 'approved',
        created_order_id: null,
        order_number: null,
        order_status: null,
        payment_status: null,
      },
    })
    expect(warnObjectSpy).toHaveBeenLastCalledWith(
      '[public-checkout:get:auto-convert]',
      {
        checkoutSessionId: 'chk-2b',
        error: { reason: 'raw failure' },
      },
    )
    warnObjectSpy.mockRestore()

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => {
        let selectedColumns = ''

        return {
          select: vi.fn((columns: string) => {
            selectedColumns = columns
            return {
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockImplementation(async () => {
                if (selectedColumns.includes('payload')) {
                  return {
                    data: {
                      id: 'chk-3',
                      status: 'pending',
                      payload: null,
                      mercado_pago_payment_id: null,
                      created_order_id: 'order-3',
                    },
                    error: null,
                  }
                }

                return {
                  data: null,
                  error: null,
                }
              }),
            }
          }),
        }
      }),
    } as never)
    expect((await publicCheckoutByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'chk-3' }) },
    )).status).toBe(404)

    const getErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failedParamsResponse = await publicCheckoutByIdRoute.GET(
      {} as never,
      { params: Promise.reject(new Error('bad params')) },
    )
    expect(failedParamsResponse.status).toBe(500)
    expect(await failedParamsResponse.json()).toEqual({
      error: 'Erro ao consultar checkout.',
    })
    expect(getErrorSpy).toHaveBeenLastCalledWith(
      '[public-checkout:get]',
      expect.any(Error),
    )
    getErrorSpy.mockRestore()

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
      expect(createCheckoutPreference).toHaveBeenLastCalledWith(
        expect.objectContaining({
          payer: { name: 'Carlos' },
        }),
      )

      const nullAccountInsertQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'chk-2' }, error: null }),
      }
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => nullAccountInsertQuery),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      } as never)
      vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce(null as never)
      vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-null-account' as never)
      vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
        id: 'pref-2',
        init_point: 'https://mp.test/live-2',
        sandbox_init_point: 'https://mp.test/sandbox-2',
      } as never)

      const nullAccountResponse = await publicCheckoutMercadoPagoRoute.POST(
        new Request('https://chefops.test/api/public/checkout/mercado-pago', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            tenant_slug: 'resto',
            customer_name: 'Carla',
            items: [{
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Pizza',
              price: 30,
              quantity: 1,
            }],
          }),
        }) as never,
      )

      expect(nullAccountResponse.status).toBe(200)
      expect((await nullAccountResponse.json()).data.checkout_url).toBe('https://mp.test/sandbox-2')
      expect(createCheckoutPreference).toHaveBeenLastCalledWith(
        expect.objectContaining({
          payer: { name: 'Carla' },
        }),
      )
      expect(infoSpy).toHaveBeenLastCalledWith(
        '[public-checkout:mercado-pago:preference-created]',
        expect.objectContaining({
          liveMode: null,
          hasSandboxUrl: true,
        }),
      )
      infoSpy.mockRestore()

      const fallbackInsertQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'chk-fallback-success' }, error: null }),
      }
      const fallbackInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => fallbackInsertQuery),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      } as never)
      vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
      vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-fallback-success' as never)
      vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
        id: 'pref-fallback-success',
        init_point: 'https://mp.test/live-fallback-success',
        sandbox_init_point: null,
      } as never)

      const fallbackResponse = await publicCheckoutMercadoPagoRoute.POST(
        new Request('https://chefops.test/api/public/checkout/mercado-pago', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            tenant_slug: 'resto',
            customer_name: 'Fabio',
            items: [{
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Risoto',
              price: 28,
              quantity: 1,
            }],
          }),
        }) as never,
      )

      expect(fallbackResponse.status).toBe(200)
      expect((await fallbackResponse.json()).data.checkout_url).toBe('https://mp.test/live-fallback-success')
      expect(fallbackInfoSpy).toHaveBeenLastCalledWith(
        '[public-checkout:mercado-pago:preference-created]',
        expect.objectContaining({
          liveMode: false,
          hasSandboxUrl: false,
        }),
      )
      fallbackInfoSpy.mockRestore()

      const liveInsertQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'chk-live' }, error: null }),
      }
      const liveInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => liveInsertQuery),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      } as never)
      vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: true } as never)
      vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-live' as never)
      vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
        id: 'pref-live',
        init_point: 'https://mp.test/live-only',
        sandbox_init_point: 'https://mp.test/sandbox-ignored',
      } as never)

      const liveResponse = await publicCheckoutMercadoPagoRoute.POST(
        new Request('https://chefops.test/api/public/checkout/mercado-pago', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            tenant_slug: 'resto',
            customer_name: 'Bianca',
            table_id: '550e8400-e29b-41d4-a716-446655440001',
            items: [{
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Massa',
              price: 42,
              quantity: 1,
            }],
          }),
        }) as never,
      )

      expect(liveResponse.status).toBe(200)
      expect((await liveResponse.json()).data.checkout_url).toBe('https://mp.test/live-only')
      expect(createCheckoutPreference).toHaveBeenLastCalledWith(
        expect.objectContaining({
          backUrls: expect.objectContaining({
            success: expect.stringContaining('&table=550e8400-e29b-41d4-a716-446655440001'),
          }),
        }),
      )
      expect(liveInfoSpy).toHaveBeenLastCalledWith(
        '[public-checkout:mercado-pago:preference-created]',
        expect.objectContaining({
          liveMode: true,
        }),
      )
      liveInfoSpy.mockRestore()

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'chk-error' }, error: null }),
          })),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: { code: 'update-failed' } }),
        })),
      } as never)
      vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
      vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-error' as never)
      vi.mocked(createCheckoutPreference).mockResolvedValueOnce({
        id: 'pref-error',
        init_point: 'https://mp.test/live-error',
        sandbox_init_point: null,
      } as never)

      const errorResponse = await publicCheckoutMercadoPagoRoute.POST(
        new Request('https://chefops.test/api/public/checkout/mercado-pago', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            tenant_slug: 'resto',
            customer_name: 'Clara',
            items: [{
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Salada',
              price: 20,
              quantity: 1,
            }],
          }),
        }) as never,
      )

      expect(errorResponse.status).toBe(500)
      expect(await errorResponse.json()).toEqual({
        error: 'Erro ao iniciar checkout online.',
      })
      expect(errorSpy).toHaveBeenLastCalledWith(
        '[public-checkout:mercado-pago]',
        { code: 'update-failed' },
      )
      errorSpy.mockRestore()

      const insertErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      } as never)
      vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
      vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-null-session' as never)

      const nullSessionResponse = await publicCheckoutMercadoPagoRoute.POST(
        new Request('https://chefops.test/api/public/checkout/mercado-pago', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            tenant_slug: 'resto',
            customer_name: 'Dora',
            items: [{
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Wrap',
              price: 18,
              quantity: 1,
            }],
          }),
        }) as never,
      )

      expect(nullSessionResponse.status).toBe(500)
      expect(await nullSessionResponse.json()).toEqual({
        error: 'Erro ao iniciar checkout online.',
      })
      expect(insertErrorSpy).toHaveBeenLastCalledWith(
        '[public-checkout:mercado-pago]',
        null,
      )
      insertErrorSpy.mockRestore()

      const errorInstanceSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(createAdminClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'chk-error-instance' }, error: null }),
          })),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      } as never)
      vi.mocked(getTenantMercadoPagoAccount).mockResolvedValueOnce({ live_mode: false } as never)
      vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValueOnce('token-error-instance' as never)
      vi.mocked(createCheckoutPreference).mockRejectedValueOnce(new Error('mp instance error'))

      const errorInstanceResponse = await publicCheckoutMercadoPagoRoute.POST(
        new Request('https://chefops.test/api/public/checkout/mercado-pago', {
          method: 'POST',
          body: JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            tenant_slug: 'resto',
            customer_name: 'Eva',
            items: [{
              menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Sopa',
              price: 16,
              quantity: 1,
            }],
          }),
        }) as never,
      )

      expect(errorInstanceResponse.status).toBe(500)
      expect(await errorInstanceResponse.json()).toEqual({
        error: 'mp instance error',
      })
      expect(errorInstanceSpy).toHaveBeenLastCalledWith(
        '[public-checkout:mercado-pago]',
        expect.any(Error),
      )
      errorInstanceSpy.mockRestore()
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = originalUrl
    }
  })
})
