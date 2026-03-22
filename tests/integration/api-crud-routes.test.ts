import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-guards', () => ({
  requireTenantRoles: vi.fn(),
  requireTenantFeature: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const { requireTenantRoles, requireTenantFeature } = await import('@/lib/auth-guards')
const { createClient } = await import('@/lib/supabase/server')
const { createAdminClient } = await import('@/lib/supabase/admin')

const categoriesRoute = await import('@/app/api/categories/route')
const extrasRoute = await import('@/app/api/extras/route')
const extraByIdRoute = await import('@/app/api/extras/[id]/route')
const productsRoute = await import('@/app/api/products/route')
const productByIdRoute = await import('@/app/api/products/[id]/route')
const stockMovementsRoute = await import('@/app/api/stock/movements/route')
const stockCloseDayRoute = await import('@/app/api/stock/close-day/route')
const usersRoute = await import('@/app/api/users/route')
const userByIdRoute = await import('@/app/api/users/[id]/route')
const tableByIdRoute = await import('@/app/api/tables/[id]/route')

function okAuthResponse(status = 403) {
  return new Response(JSON.stringify({ error: 'forbidden' }), { status })
}

describe('api crud routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('categories GET/POST/PATCH/DELETE cobrem autorizacao, validacao, limite e sucesso', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: okAuthResponse(),
    } as never)
    expect((await categoriesRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({ data: [{ id: 'cat-1', name: 'Bebidas' }], error: null }).then(resolve)
          },
        }),
      },
    } as never)
    expect((await (await categoriesRoute.GET()).json()).data[0].name).toBe('Bebidas')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({ data: null, error: new Error('categories failed') }).then(resolve)
          },
        }),
      },
    } as never)
    expect((await categoriesRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {},
    } as never)
    const invalidPost = await categoriesRoute.POST(
      new Request('https://chefops.test/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: '', display_order: 0, goes_to_kitchen: true }),
      }) as never,
    )
    expect(invalidPost.status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 10 }),
        }),
      },
    } as never)
    const limitedPost = await categoriesRoute.POST(
      new Request('https://chefops.test/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Massas', display_order: 1, goes_to_kitchen: true }),
      }) as never,
    )
    expect(limitedPost.status).toBe(429)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: () => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'cat-2', name: 'Massas' },
              error: null,
            }),
          })),
        }),
      },
    } as never)
    expect((await categoriesRoute.POST(
      new Request('https://chefops.test/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Massas', display_order: 1, goes_to_kitchen: true }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: () => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('insert failed'),
            }),
          })),
        }),
      },
    } as never)
    expect((await categoriesRoute.POST(
      new Request('https://chefops.test/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Massas', display_order: 1, goes_to_kitchen: true }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await categoriesRoute.PATCH(
      new Request('https://chefops.test/api/categories', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Sem id' }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'cat-1', name: 'Novo' }, error: null }),
          })),
        }),
      },
    } as never)
    expect((await categoriesRoute.PATCH(
      new Request('https://chefops.test/api/categories', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'cat-1', name: 'Novo' }),
      }) as never,
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockRejectedValue(new Error('update failed')),
          })),
        }),
      },
    } as never)
    expect((await categoriesRoute.PATCH(
      new Request('https://chefops.test/api/categories', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'cat-1', name: 'Novo' }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await categoriesRoute.DELETE(
      new Request('https://chefops.test/api/categories') as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        }),
      },
    } as never)
    expect((await categoriesRoute.DELETE(
      new Request('https://chefops.test/api/categories?id=cat-1') as never,
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn()
            .mockReturnValueOnce({
              eq: vi.fn().mockResolvedValue({ error: new Error('delete failed') }),
            }),
        }),
      },
    } as never)
    expect((await categoriesRoute.DELETE(
      new Request('https://chefops.test/api/categories?id=cat-1') as never,
    )).status).toBe(500)
  })

  it('extras e products cobrem listagem, validacao, limites e rotas por id', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: okAuthResponse(401),
    } as never)
    expect((await extrasRoute.GET()).status).toBe(401)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({ data: [{ id: 'extra-1', name: 'Cheddar' }], error: null }).then(resolve)
          },
        }),
      },
    } as never)
    expect((await (await extrasRoute.GET()).json()).data[0].name).toBe('Cheddar')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({ data: null, error: new Error('extras failed') }).then(resolve)
          },
        }),
      },
    } as never)
    expect((await extrasRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {},
    } as never)
    expect((await extrasRoute.POST(
      new Request('https://chefops.test/api/extras', {
        method: 'POST',
        body: JSON.stringify({ name: '', price: -1, category: 'other', active: true }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({ count: 20 }).then(resolve)
          },
        }),
      },
    } as never)
    expect((await extrasRoute.POST(
      new Request('https://chefops.test/api/extras', {
        method: 'POST',
        body: JSON.stringify({ name: 'A', price: 1, category: 'other', active: true }),
      }) as never,
    )).status).toBe(429)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: () => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'extra-2', name: 'Catupiry' },
              error: null,
            }),
          })),
        }),
      },
    } as never)
    expect((await extrasRoute.POST(
      new Request('https://chefops.test/api/extras', {
        method: 'POST',
        body: JSON.stringify({ name: 'Catupiry', price: 4.5, category: 'border', active: true }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: () => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('insert failed'),
            }),
          })),
        }),
      },
    } as never)
    expect((await extrasRoute.POST(
      new Request('https://chefops.test/api/extras', {
        method: 'POST',
        body: JSON.stringify({ name: 'Cheddar', price: 5, category: 'other', active: true }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'extra-1', name: 'Cheddar' }, error: null }),
        })),
      }),
    } as never)
    expect((await extraByIdRoute.PATCH(
      new Request('https://chefops.test/api/extras/extra-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Cheddar' }),
      }) as never,
      { params: Promise.resolve({ id: 'extra-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({} as never)
    expect((await extraByIdRoute.PATCH(
      new Request('https://chefops.test/api/extras/extra-1', {
        method: 'PATCH',
        body: JSON.stringify({ price: -1 }),
      }) as never,
      { params: Promise.resolve({ id: 'extra-1' }) },
    )).status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
        })),
      }),
    } as never)
    expect((await extraByIdRoute.PATCH(
      new Request('https://chefops.test/api/extras/extra-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Cheddar' }),
      }) as never,
      { params: Promise.resolve({ id: 'extra-1' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      }),
    } as never)
    expect((await extraByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'extra-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('delete failed') }),
        })),
      }),
    } as never)
    expect((await extraByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'extra-1' }) },
    )).status).toBe(500)

    const productQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({ data: [{ id: 'prod-1' }], error: null, count: 1 }).then(resolve)
      },
    }
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      supabase: { from: () => productQuery },
    } as never)
    expect((await productsRoute.GET(
      new Request('https://chefops.test/api/products?search=far&category_id=cat-1&active=true&page=1&pageSize=10') as never,
    )).status).toBe(200)

    const failedProductQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({ data: null, error: new Error('products failed'), count: 0 }).then(resolve)
      },
    }
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      supabase: { from: () => failedProductQuery },
    } as never)
    expect((await productsRoute.GET(
      new Request('https://chefops.test/api/products?active=false') as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await productsRoute.POST(
      new Request('https://chefops.test/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: '', unit: 'un', cost_price: -1, min_stock: -1 }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { max_products: 1 } }),
            }
          }

          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 1 }),
          }
        }),
      },
    } as never)
    expect((await productsRoute.POST(
      new Request('https://chefops.test/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Farinha', unit: 'kg', cost_price: 10, min_stock: 2 }),
      }) as never,
    )).status).toBe(429)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { max_products: -1 } }),
            }
          }

          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23505' },
              }),
            })),
          }
        }),
      },
    } as never)
    expect((await productsRoute.POST(
      new Request('https://chefops.test/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Farinha', sku: 'SKU-1', unit: 'kg', cost_price: 10, min_stock: 2 }),
      }) as never,
    )).status).toBe(409)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { max_products: -1 } }),
            }
          }

          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'prod-2', name: 'Farinha' },
                error: null,
              }),
            })),
          }
        }),
      },
    } as never)
    expect((await productsRoute.POST(
      new Request('https://chefops.test/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Farinha', unit: 'kg', cost_price: 10, min_stock: 2 }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'prod-1' }, error: null }),
      }),
    } as never)
    expect((await productByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'prod-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'prod-1' }, error: null }),
        })),
      }),
    } as never)
    expect((await productByIdRoute.PATCH(
      new Request('https://chefops.test/api/products/prod-1', {
        method: 'PATCH',
        body: JSON.stringify({ active: false }),
      }) as never,
      { params: Promise.resolve({ id: 'prod-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
      }),
    } as never)
    expect((await productByIdRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'prod-404' }) },
    )).status).toBe(404)

    expect((await productByIdRoute.PATCH(
      new Request('https://chefops.test/api/products/prod-1', {
        method: 'PATCH',
        body: JSON.stringify({ category_id: 'bad-uuid' }),
      }) as never,
      { params: Promise.resolve({ id: 'prod-1' }) },
    )).status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
        })),
      }),
    } as never)
    expect((await productByIdRoute.PATCH(
      new Request('https://chefops.test/api/products/prod-404', {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      }) as never,
      { params: Promise.resolve({ id: 'prod-404' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      }),
    } as never)
    expect((await productByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'prod-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('delete failed') }),
        })),
      }),
    } as never)
    expect((await productByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'prod-1' }) },
    )).status).toBe(500)
  })

  it('stock movements e close day cobrem filtros, saldo insuficiente, conflitos e sucesso', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: okAuthResponse(),
    } as never)
    expect((await stockMovementsRoute.GET(
      new Request('https://chefops.test/api/stock/movements') as never,
    )).status).toBe(403)

    const movementsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({ data: [{ id: 'mov-1' }], error: null, count: 1 }).then(resolve)
      },
    }
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: { from: () => movementsQuery },
    } as never)
    expect((await stockMovementsRoute.GET(
      new Request('https://chefops.test/api/stock/movements?product_id=prod-1&from=2026-03-01&to=2026-03-21') as never,
    )).status).toBe(200)

    const failedMovementsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({ data: null, error: new Error('query failed'), count: 0 }).then(resolve)
      },
    }
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: { from: () => failedMovementsQuery },
    } as never)
    expect((await stockMovementsRoute.GET(
      new Request('https://chefops.test/api/stock/movements?page=2&pageSize=10') as never,
    )).status).toBe(500)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: okAuthResponse(),
    } as never)
    expect((await stockMovementsRoute.POST(
      new Request('https://chefops.test/api/stock/movements', {
        method: 'POST',
        body: JSON.stringify({
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'entry',
          quantity: 1,
        }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {},
    } as never)
    expect((await stockMovementsRoute.POST(
      new Request('https://chefops.test/api/stock/movements', {
        method: 'POST',
        body: JSON.stringify({ product_id: 'bad', type: 'entry', quantity: 0 }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'stock_balance') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { current_stock: 1 } }),
            }
          }
          return {}
        }),
      },
    } as never)
    expect((await stockMovementsRoute.POST(
      new Request('https://chefops.test/api/stock/movements', {
        method: 'POST',
        body: JSON.stringify({
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'loss',
          quantity: 5,
        }),
      }) as never,
    )).status).toBe(422)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'stock_movements') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'mov-1' }, error: null }),
              })),
            }
          }

          return {}
        }),
      },
    } as never)
    expect((await stockMovementsRoute.POST(
      new Request('https://chefops.test/api/stock/movements', {
        method: 'POST',
        body: JSON.stringify({
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'entry',
          quantity: 5,
        }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'stock_balance') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { current_stock: 20 } }),
            }
          }

          if (table === 'stock_movements') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') }),
              })),
            }
          }

          return {}
        }),
      },
    } as never)
    expect((await stockMovementsRoute.POST(
      new Request('https://chefops.test/api/stock/movements', {
        method: 'POST',
        body: JSON.stringify({
          product_id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'exit',
          quantity: 5,
        }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'stock_snapshots') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'snap-1' }] }),
            }
          }
          return {}
        }),
      },
    } as never)
    expect((await stockCloseDayRoute.POST()).status).toBe(409)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'stock_snapshots') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }
          }

          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then(resolve: (value: unknown) => unknown) {
              return Promise.resolve({ data: [], error: null }).then(resolve)
            },
          }
        }),
      },
    } as never)
    expect((await stockCloseDayRoute.POST()).status).toBe(422)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'stock_snapshots') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [] }),
              insert: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: null, error: new Error('snapshot failed') }),
              })),
            }
          }

          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then(resolve: (value: unknown) => unknown) {
              return Promise.resolve({ data: [{ product_id: 'p1', current_stock: 3 }], error: null }).then(resolve)
            },
          }
        }),
      },
    } as never)
    expect((await stockCloseDayRoute.POST()).status).toBe(500)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'stock_snapshots') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [] }),
              insert: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({ data: [{}, {}], error: null }),
              })),
            }
          }

          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then(resolve: (value: unknown) => unknown) {
              return Promise.resolve({ data: [{ product_id: 'p1', current_stock: 3 }, { product_id: 'p2', current_stock: 4 }], error: null }).then(resolve)
            },
          }
        }),
      },
    } as never)
    expect((await stockCloseDayRoute.POST()).status).toBe(200)
  })

  it('users GET/POST/PATCH/DELETE cobrem autorizacao, limites e fluxos principais', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await usersRoute.GET()).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      })),
    } as never)
    expect((await usersRoute.GET()).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'owner-1', full_name: 'Maria', role: 'owner', created_at: '2026-03-21T00:00:00.000Z' }],
          error: null,
        }),
      })),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: 'owner-1', email: 'maria@test.com' }] },
            error: null,
          }),
        },
      },
    } as never)
    expect((await usersRoute.GET()).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: [] } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('profiles failed'),
        }),
      })),
      auth: {
        admin: {
          listUsers: vi.fn(),
        },
      },
    } as never)
    expect((await usersRoute.GET()).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'owner-1', full_name: 'Maria', role: 'owner', created_at: '2026-03-21T00:00:00.000Z' }],
          error: null,
        }),
      })),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [] },
            error: new Error('users failed'),
          }),
        },
      },
    } as never)
    expect((await usersRoute.GET()).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'manager' }),
      }) as never,
    )).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'manager-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'manager-1', tenant_id: 'tenant-1', role: 'manager', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'manager' }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'C', email: 'bad', password: '123', role: 'manager' }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'free' } } }),
      })),
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'owner' }),
      }) as never,
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ role: 'owner' }, { role: 'manager' }, { role: 'cashier' }, { role: 'kitchen' }],
          error: null,
        }),
      })),
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'manager' }),
      }) as never,
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ role: 'owner' }], error: new Error('profiles failed') }),
      })),
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'manager' }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ role: 'owner' }], error: null }),
      })),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'already registered' },
          }),
        },
      },
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'cashier' }),
      }) as never,
    )).status).toBe(409)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ role: 'owner' }], error: null }),
      })),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      },
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'cashier' }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ role: 'owner' }], error: null }),
            upsert: vi.fn().mockResolvedValue({ error: new Error('profile failed') }),
          }
        }

        return {}
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-2' } },
            error: null,
          }),
          deleteUser: vi.fn(),
        },
      },
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'manager' }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ role: 'owner' }], error: null }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          }
        }

        return {}
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-3' } },
            error: null,
          }),
          deleteUser: vi.fn(),
        },
      },
    } as never)
    expect((await usersRoute.POST(
      new Request('https://chefops.test/api/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'Carlos', email: 'c@test.com', password: '123456', role: 'cashier' }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'user-2', tenant_id: 'tenant-1', role: 'cashier' }, error: null }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-2', role: 'manager' }, error: null }),
        })),
      })),
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/user-2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      }) as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'user-2', tenant_id: 'tenant-1', role: 'owner' }, error: null }),
              })
              .mockReturnValueOnce({
                eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
              }),
          }
        }

        return {}
      }),
      auth: { admin: { deleteUser: vi.fn() } },
    } as never)
    expect((await userByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/user-2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      }) as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'manager-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'manager-1', tenant_id: 'tenant-1', role: 'manager', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    expect((await userByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(403)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/owner-1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      }) as never,
      { params: Promise.resolve({ id: 'owner-1' }) },
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
      })),
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/user-404', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      }) as never,
      { params: Promise.resolve({ id: 'user-404' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'free' } } }),
      })),
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/user-2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'owner' }),
      }) as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    let patchProfilesErrorCall = 0
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table !== 'profiles') return {}

        patchProfilesErrorCall += 1

        if (patchProfilesErrorCall === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'user-2', tenant_id: 'tenant-1', role: 'manager' }, error: null }),
          }
        }

        if (patchProfilesErrorCall === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'owner-1', role: 'owner' }], error: new Error('profiles failed') }),
          }
        }

        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        }
      }),
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/user-2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'cashier' }),
      }) as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    let patchProfilesLimitCall = 0
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table !== 'profiles') return {}

        patchProfilesLimitCall += 1

        if (patchProfilesLimitCall === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'user-2', tenant_id: 'tenant-1', role: 'cashier' }, error: null }),
          }
        }

        if (patchProfilesLimitCall === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'owner-1', role: 'owner' },
                { id: 'manager-1', role: 'manager' },
                { id: 'cashier-1', role: 'cashier' },
                { id: 'kitchen-1', role: 'kitchen' },
              ],
              error: null,
            }),
          }
        }

        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        }
      }),
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/user-2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      }) as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn()
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'user-2', tenant_id: 'tenant-1', role: 'cashier' }, error: null }),
              })
              .mockReturnValueOnce({
                eq: vi.fn().mockResolvedValue({ data: [{ id: 'owner-1', role: 'owner' }], error: null }),
              })
              .mockReturnValueOnce({
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') }),
              }),
          }
        }

        return {}
      }),
    } as never)
    expect((await userByIdRoute.PATCH(
      new Request('https://chefops.test/api/users/user-2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      }) as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    expect((await userByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'owner-1' }) },
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
      })),
      auth: { admin: { deleteUser: vi.fn() } },
    } as never)
    expect((await userByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'user-404' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner', tenants: { plan: 'basic' } } }),
      })),
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'user-2', tenant_id: 'tenant-1', role: 'cashier' }, error: null }),
        delete: vi.fn().mockReturnThis(),
      })),
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: new Error('auth failed') }) } },
    } as never)
    expect((await userByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'user-2' }) },
    )).status).toBe(500)
  })

  it('tables [id] cobre validacao, 404, comanda aberta e falha de exclusao', async () => {
    expect((await tableByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/table-1', {
        method: 'PATCH',
        body: JSON.stringify({ capacity: 0 }),
      }) as never,
      { params: Promise.resolve({ id: 'table-1' }) },
    )).status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
        })),
      }),
    } as never)
    expect((await tableByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/table-404', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'maintenance' }),
      }) as never,
      { params: Promise.resolve({ id: 'table-404' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'table_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'session-1' } }),
          }
        }

        return {}
      }),
    } as never)
    expect((await tableByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'table-1' }) },
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'table_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
          }
        }

        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: new Error('delete failed') }),
        }
      }),
    } as never)
    expect((await tableByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'table-1' }) },
    )).status).toBe(500)
  })
})
