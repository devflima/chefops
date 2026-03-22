import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'

vi.mock('@/lib/auth-guards', () => ({
  requireTenantFeature: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const { requireTenantFeature } = await import('@/lib/auth-guards')
const { createAdminClient } = await import('@/lib/supabase/admin')
const salesMetricsRoute = await import('@/app/api/sales/metrics/route')
const stockAlertsRoute = await import('@/app/api/stock/alerts/route')
const stockBalanceRoute = await import('@/app/api/stock/balance/route')
const notificationSettingsRoute = await import('@/app/api/notification-settings/route')
const kdsRoute = await import('@/app/api/orders/kds/route')

describe('api feature routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sales metrics GET calcula métricas por período customizado', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [
              { id: '1', status: 'delivered', total: 30, payment_status: 'paid' },
              { id: '2', status: 'cancelled', total: 10, payment_status: 'pending' },
              { id: '3', status: 'pending', total: 20, payment_status: 'pending' },
            ],
            error: null,
          }),
        }),
      },
    } as never)

    const response = await salesMetricsRoute.GET(
      new Request('https://chefops.test/api/sales/metrics?period=custom&from=2026-03-01&to=2026-03-21') as never
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.total_orders).toBe(3)
    expect(json.data.revenue).toBe(30)
    expect(json.data.cancellation_rate).toBe(33)
  })

  it('sales metrics GET cobre auth negada, fallback de período e zero pedidos', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    } as never)
    expect((await salesMetricsRoute.GET(
      new Request('https://chefops.test/api/sales/metrics') as never
    )).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      },
    } as never)

    const emptyResponse = await salesMetricsRoute.GET(
      new Request('https://chefops.test/api/sales/metrics?period=weird') as never
    )
    const emptyJson = await emptyResponse.json()

    expect(emptyResponse.status).toBe(200)
    expect(emptyJson.data.period).toBe('weird')
    expect(emptyJson.data.total_orders).toBe(0)
    expect(emptyJson.data.average_ticket).toBe(0)
    expect(emptyJson.data.cancellation_rate).toBe(0)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('metrics failed'),
          }),
        }),
      },
    } as never)
    expect((await salesMetricsRoute.GET(
      new Request('https://chefops.test/api/sales/metrics?period=today') as never
    )).status).toBe(500)
  })

  it('stock alerts GET e stock balance GET enriquecem resultados', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          filter: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [{ id: '1', current_stock: 2, min_stock: 5 }],
            error: null,
          }),
        }),
      },
    } as never)

    const alerts = await stockAlertsRoute.GET()
    expect((await alerts.json()).data[0]).toMatchObject({
      is_low_stock: true,
      deficit: 3,
    })

    const balanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({
          data: [{ id: '1', current_stock: 2, min_stock: 2 }],
          error: null,
        }).then(resolve)
      },
    }
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => balanceQuery,
      },
    } as never)

    const balance = await stockBalanceRoute.GET(
      new Request('https://chefops.test/api/stock/balance?category_id=cat-1&only_active=true') as never
    )
    expect((await balance.json()).data[0].is_low_stock).toBe(true)

    const allItemsBalanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({
          data: [{ id: '2', current_stock: 5, min_stock: 2 }],
          error: null,
        }).then(resolve)
      },
    }
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => allItemsBalanceQuery,
      },
    } as never)

    const allItemsBalance = await stockBalanceRoute.GET(
      new Request('https://chefops.test/api/stock/balance?only_active=false') as never
    )
    expect((await allItemsBalance.json()).data[0].is_low_stock).toBe(false)

    const failedBalanceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({
          data: null,
          error: new Error('balance failed'),
        }).then(resolve)
      },
    }
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => failedBalanceQuery,
      },
    } as never)
    expect((await stockBalanceRoute.GET(
      new Request('https://chefops.test/api/stock/balance') as never
    )).status).toBe(500)
  })

  it('stock alerts GET cobre acesso negado e erro do banco', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    } as never)
    expect((await stockAlertsRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          filter: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('alerts failed'),
          }),
        }),
      },
    } as never)

    expect((await stockAlertsRoute.GET()).status).toBe(500)
  })

  it('notification settings GET faz merge de defaults e PATCH valida body', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    } as never)
    expect((await notificationSettingsRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        tenant_notification_settings: () => ({
          data: { whatsapp_order_delivered: true },
          error: null,
        }),
      }) as never
    )

    const getResponse = await notificationSettingsRoute.GET()
    const getJson = await getResponse.json()
    expect(getJson.data.whatsapp_order_received).toBe(true)
    expect(getJson.data.whatsapp_order_delivered).toBe(true)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        tenant_notification_settings: () => ({
          data: null,
          error: new Error('settings failed'),
        }),
      }) as never
    )
    expect((await notificationSettingsRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    const invalidPatch = await notificationSettingsRoute.PATCH(
      new Request('https://chefops.test/api/notification-settings', {
        method: 'PATCH',
        body: JSON.stringify({ whatsapp_order_received: 'invalid' }),
      })
    )
    expect(invalidPatch.status).toBe(400)
  })

  it('notification settings PATCH salva configurações e KDS filtra itens de cozinha', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    } as never)
    expect((await notificationSettingsRoute.PATCH(
      new Request('https://chefops.test/api/notification-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          whatsapp_order_received: true,
          whatsapp_order_confirmed: true,
          whatsapp_order_preparing: true,
          whatsapp_order_ready: true,
          whatsapp_order_out_for_delivery: true,
          whatsapp_order_delivered: false,
          whatsapp_order_cancelled: true,
        }),
      })
    )).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        tenant_notification_settings: (state) => ({
          data: { id: 'cfg-1', ...state.rows?.[0] },
          error: null,
        }),
      }) as never
    )

    const patchResponse = await notificationSettingsRoute.PATCH(
      new Request('https://chefops.test/api/notification-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          whatsapp_order_received: true,
          whatsapp_order_confirmed: true,
          whatsapp_order_preparing: true,
          whatsapp_order_ready: true,
          whatsapp_order_out_for_delivery: true,
          whatsapp_order_delivered: false,
          whatsapp_order_cancelled: true,
        }),
      })
    )
    expect(patchResponse.status).toBe(200)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce(
      createMockSupabaseClient({
        tenant_notification_settings: () => ({
          data: null,
          error: new Error('upsert failed'),
        }),
      }) as never
    )
    expect((await notificationSettingsRoute.PATCH(
      new Request('https://chefops.test/api/notification-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          whatsapp_order_received: true,
          whatsapp_order_confirmed: true,
          whatsapp_order_preparing: true,
          whatsapp_order_ready: true,
          whatsapp_order_out_for_delivery: true,
          whatsapp_order_delivered: false,
          whatsapp_order_cancelled: true,
        }),
      })
    )).status).toBe(500)

    let categoryLookup = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'kds_orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'order-1',
                  items: [
                    { id: 'a', menu_item_id: 'menu-1' },
                    { id: 'b', menu_item_id: 'menu-2' },
                  ],
                },
              ],
              error: null,
            }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(async () => {
            categoryLookup += 1
            return {
              data: { category: { goes_to_kitchen: categoryLookup > 1 } },
            }
          }),
        }
      }),
    }

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase,
    } as never)

    const kdsResponse = await kdsRoute.GET()
    const kdsJson = await kdsResponse.json()
    expect(kdsJson.data[0].items).toEqual([{ id: 'b', menu_item_id: 'menu-2' }])
  })

  it('kds GET cobre auth negada, erro interno e itens sem category array', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
    } as never)
    expect((await kdsRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('kds failed') }),
        }),
      },
    } as never)
    expect((await kdsRoute.GET()).status).toBe(500)

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'kds_orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'order-1',
                  items: [
                    { id: 'a', menu_item_id: null },
                    { id: 'b', menu_item_id: 'menu-1' },
                  ],
                },
              ],
              error: null,
            }),
          }
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { category: null },
          }),
        }
      }),
    }

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase,
    } as never)

    const response = await kdsRoute.GET()
    const json = await response.json()
    expect(json.data[0].items).toEqual([{ id: 'b', menu_item_id: 'menu-1' }])
  })
})
