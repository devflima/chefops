import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { createClient } = await import('@/lib/supabase/server')

const cepRoute = await import('@/app/api/cep/[cep]/route')
const menuRoute = await import('@/app/api/menu/[slug]/route')
const qrcodeUrlRoute = await import('@/app/api/tables/qrcode-url/route')
const qrcodeRoute = await import('@/app/api/tables/qrcode/[token]/route')
const sessionsRoute = await import('@/app/api/tables/sessions/route')
const sessionByIdRoute = await import('@/app/api/tables/sessions/[id]/route')

describe('api public and table routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cep GET cobre validacao, nao encontrado e sucesso', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect((await cepRoute.GET(
      {} as never,
      { params: Promise.resolve({ cep: '12' }) },
    )).status).toBe(400)

    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ erro: true }),
    } as never)
    expect((await cepRoute.GET(
      {} as never,
      { params: Promise.resolve({ cep: '12345-678' }) },
    )).status).toBe(404)

    fetchMock.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({
        logradouro: 'Rua A',
        bairro: 'Centro',
        localidade: 'Sao Paulo',
        uf: 'SP',
      }),
    } as never)

    const response = await cepRoute.GET(
      {} as never,
      { params: Promise.resolve({ cep: '12345-678' }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: {
        zip_code: '12345678',
        street: 'Rua A',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
      },
    })

    fetchMock.mockRejectedValueOnce(new Error('network failed'))
    expect((await cepRoute.GET(
      {} as never,
      { params: Promise.resolve({ cep: '12345-678' }) },
    )).status).toBe(500)
  })

  it('menu publico GET cobre 404 e agrupamento por categoria', async () => {
    const firstTenantQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
    }
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => firstTenantQuery),
    } as never)

    expect((await menuRoute.GET(
      {} as never,
      { params: Promise.resolve({ slug: 'resto' }) },
    )).status).toBe(404)

    const tenantQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'tenant-1', name: 'ChefOps', slug: 'resto' },
        error: null,
      }),
    }
    const itemsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn()
        .mockReturnThis()
        .mockImplementationOnce(() => itemsQuery)
        .mockResolvedValueOnce({
          data: [
            {
              id: 'item-1',
              name: 'Burger',
              category_id: 'cat-1',
              category: { id: 'cat-1', name: 'Lanches' },
            },
            {
              id: 'item-3',
              name: 'Batata',
              category_id: 'cat-1',
              category: { id: 'cat-1', name: 'Lanches' },
            },
            {
              id: 'item-2',
              name: 'Suco',
              category_id: null,
              category: null,
            },
          ],
          error: null,
        }),
    }
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn((table: string) => (table === 'tenants' ? tenantQuery : itemsQuery)),
    } as never)

    const response = await menuRoute.GET(
      {} as never,
      { params: Promise.resolve({ slug: 'resto' }) },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      data: {
        tenant: { id: 'tenant-1', name: 'ChefOps', slug: 'resto' },
        menu: [
          {
            category: { id: 'cat-1', name: 'Lanches' },
            items: [
              { id: 'item-1', name: 'Burger' },
              { id: 'item-3', name: 'Batata' },
            ],
          },
          {
            category: null,
            items: [{ id: 'item-2', name: 'Suco' }],
          },
        ],
      },
    })

    const tenantQueryWithItemsError = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'tenant-1', name: 'ChefOps', slug: 'resto' },
        error: null,
      }),
    }
    const itemsErrorQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn()
        .mockReturnThis()
        .mockImplementationOnce(() => itemsErrorQuery)
        .mockResolvedValueOnce({
          data: null,
          error: new Error('items failed'),
        }),
    }
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn((table: string) => (table === 'tenants' ? tenantQueryWithItemsError : itemsErrorQuery)),
    } as never)

    expect((await menuRoute.GET(
      {} as never,
      { params: Promise.resolve({ slug: 'resto' }) },
    )).status).toBe(500)
  })

  it('qrcode url e token cobrem validacao, 404 e sucesso', async () => {
    const originalUrl = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.test'

    try {
      expect((await qrcodeUrlRoute.GET(
        new Request('https://chefops.test/api/tables/qrcode-url') as never,
      )).status).toBe(400)

      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
        })),
      } as never)
      expect((await qrcodeUrlRoute.GET(
        new Request('https://chefops.test/api/tables/qrcode-url?table_id=table-1') as never,
      )).status).toBe(404)

      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              token: 'qr-token',
              table: { number: '10', tenants: { slug: 'resto' } },
            },
            error: null,
          }),
        })),
      } as never)

      const qrcodeUrlResponse = await qrcodeUrlRoute.GET(
        new Request('https://chefops.test/api/tables/qrcode-url?table_id=table-1') as never,
      )
      expect(qrcodeUrlResponse.status).toBe(200)
      await expect(qrcodeUrlResponse.json()).resolves.toEqual({
        url: 'https://chefops.test/resto/menu?table=qr-token',
      })

      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              token: 'qr-token-array',
              table: [{ number: '11', tenants: [{ slug: 'resto-array' }] }],
            },
            error: null,
          }),
        })),
      } as never)

      const qrcodeUrlArrayResponse = await qrcodeUrlRoute.GET(
        new Request('https://chefops.test/api/tables/qrcode-url?table_id=table-2') as never,
      )
      expect(qrcodeUrlArrayResponse.status).toBe(200)
      await expect(qrcodeUrlArrayResponse.json()).resolves.toEqual({
        url: 'https://chefops.test/resto-array/menu?table=qr-token-array',
      })

      vi.mocked(createClient).mockRejectedValueOnce(new Error('qrcode url down') as never)
      expect((await qrcodeUrlRoute.GET(
        new Request('https://chefops.test/api/tables/qrcode-url?table_id=table-1') as never,
      )).status).toBe(500)

      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              token: 'qr-token',
              table: { id: 'table-1', number: '10', tenant_id: 'tenant-1', tenants: { slug: 'resto' } },
            },
            error: null,
          }),
        })),
      } as never)

      const qrcodeResponse = await qrcodeRoute.GET(
        {} as never,
        { params: Promise.resolve({ token: 'qr-token' }) },
      )
      expect(qrcodeResponse.status).toBe(200)
      await expect(qrcodeResponse.json()).resolves.toMatchObject({
        data: {
          token: 'qr-token',
          table: { id: 'table-1', number: '10', tenant_id: 'tenant-1' },
        },
      })

      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      } as never)
      expect((await qrcodeRoute.GET(
        {} as never,
        { params: Promise.resolve({ token: 'qr-token' }) },
      )).status).toBe(404)

      vi.mocked(createClient).mockRejectedValueOnce(new Error('db down') as never)
      expect((await qrcodeRoute.GET(
        {} as never,
        { params: Promise.resolve({ token: 'qr-token' }) },
      )).status).toBe(500)
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = originalUrl
    }
  })

  it('sessions POST cobre validacao, auth, conflito e sucesso', async () => {
    expect((await sessionsRoute.POST(
      new Request('https://chefops.test/api/tables/sessions', {
        method: 'POST',
        body: JSON.stringify({ table_id: 'bad-id', customer_count: 0 }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)
    expect((await sessionsRoute.POST(
      new Request('https://chefops.test/api/tables/sessions', {
        method: 'POST',
        body: JSON.stringify({ table_id: '550e8400-e29b-41d4-a716-446655440000', customer_count: 2 }),
      }) as never,
    )).status).toBe(401)

    const conflictProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    const conflictSessionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'sess-1' } }),
    }
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) =>
        table === 'profiles' ? conflictProfileQuery : conflictSessionQuery
      ),
    } as never)
    expect((await sessionsRoute.POST(
      new Request('https://chefops.test/api/tables/sessions', {
        method: 'POST',
        body: JSON.stringify({ table_id: '550e8400-e29b-41d4-a716-446655440000', customer_count: 2 }),
      }) as never,
    )).status).toBe(409)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      })),
    } as never)
    expect((await sessionsRoute.POST(
      new Request('https://chefops.test/api/tables/sessions', {
        method: 'POST',
        body: JSON.stringify({ table_id: '550e8400-e29b-41d4-a716-446655440000', customer_count: 2 }),
      }) as never,
    )).status).toBe(404)

    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    const existingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }
    const insertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'sess-2' }, error: null }),
    }
    const tablesUpdateQuery = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profileQuery
        if (table === 'table_sessions') {
          return {
            select: existingQuery.select,
            eq: existingQuery.eq,
            single: existingQuery.single,
            insert: vi.fn(() => insertQuery),
          }
        }

        return {
          update: vi.fn(() => tablesUpdateQuery),
        }
      }),
    } as never)
    expect((await sessionsRoute.POST(
      new Request('https://chefops.test/api/tables/sessions', {
        method: 'POST',
        body: JSON.stringify({ table_id: '550e8400-e29b-41d4-a716-446655440000', customer_count: 2 }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profileQuery
        if (table === 'table_sessions') {
          return {
            select: existingQuery.select,
            eq: existingQuery.eq,
            single: existingQuery.single,
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') }),
            })),
          }
        }

        return {
          update: vi.fn(() => tablesUpdateQuery),
        }
      }),
    } as never)
    expect((await sessionsRoute.POST(
      new Request('https://chefops.test/api/tables/sessions', {
        method: 'POST',
        body: JSON.stringify({ table_id: '550e8400-e29b-41d4-a716-446655440000', customer_count: 2 }),
      }) as never,
    )).status).toBe(500)
  })

  it('session por id GET/PATCH cobre 404, validacao, auth e fechamento', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
      })),
    } as never)
    expect((await sessionByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as never)
    expect((await sessionByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'sess-1',
            table_id: 'table-1',
            orders: [{ id: 'ord-1', total: 25 }],
          },
          error: null,
        }),
      })),
    } as never)
    expect((await sessionByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockRejectedValueOnce(new Error('db down') as never)
    expect((await sessionByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(500)

    expect((await sessionByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/sessions/sess-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'open' }),
      }) as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)
    expect((await sessionByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/sessions/sess-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      })),
    } as never)
    expect((await sessionByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/sessions/sess-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(404)

    const loadSessionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'sess-1',
          table_id: 'table-1',
          orders: [{ total: 10, payment_status: 'paid' }, { total: 15, payment_status: 'pending' }],
        },
      }),
    }
    const updateSessionQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'sess-1', total: 25 }, error: null }),
    }
    const freeTableQuery = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'table_sessions') {
          return {
            select: loadSessionQuery.select,
            eq: loadSessionQuery.eq,
            single: loadSessionQuery.single,
            update: vi.fn(() => updateSessionQuery),
          }
        }

        return {
          update: vi.fn(() => freeTableQuery),
        }
      }),
    } as never)
    expect((await sessionByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/sessions/sess-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(200)

    const loadSessionWithoutOrdersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'sess-2',
          table_id: 'table-2',
        },
      }),
    }
    const updateSessionWithoutOrdersQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'sess-2', total: 0 }, error: null }),
    }
    const freeSecondTableQuery = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'table_sessions') {
          return {
            select: loadSessionWithoutOrdersQuery.select,
            eq: loadSessionWithoutOrdersQuery.eq,
            single: loadSessionWithoutOrdersQuery.single,
            update: vi.fn(() => updateSessionWithoutOrdersQuery),
          }
        }

        return {
          update: vi.fn(() => freeSecondTableQuery),
        }
      }),
    } as never)
    const patchWithoutOrders = await sessionByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/sessions/sess-2', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'sess-2' }) },
    )
    expect(patchWithoutOrders.status).toBe(200)
    await expect(patchWithoutOrders.json()).resolves.toMatchObject({
      data: { id: 'sess-2', total: 0 },
    })

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'table_sessions') {
          return {
            select: loadSessionQuery.select,
            eq: loadSessionQuery.eq,
            single: loadSessionQuery.single,
            update: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') }),
            })),
          }
        }

        return {
          update: vi.fn(() => freeTableQuery),
        }
      }),
    } as never)
    expect((await sessionByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/sessions/sess-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'sess-1' }) },
    )).status).toBe(500)
  })
})
