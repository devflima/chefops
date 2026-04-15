import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-guards', () => ({
  requireTenantRoles: vi.fn(),
  requireTenantFeature: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const { requireTenantRoles, requireTenantFeature } = await import('@/lib/auth-guards')
const { createAdminClient } = await import('@/lib/supabase/admin')
const { createClient } = await import('@/lib/supabase/server')

const customersRoute = await import('@/app/api/customers/route')
const menuItemsRoute = await import('@/app/api/menu-items/route')
const menuItemByIdRoute = await import('@/app/api/menu-items/[id]/route')
const menuItemExtrasRoute = await import('@/app/api/menu-items/[id]/extras/route')
const menuItemIngredientsRoute = await import('@/app/api/menu-items/[id]/ingredients/route')

function forbiddenResponse(status = 403) {
  return new Response(JSON.stringify({ error: 'forbidden' }), { status })
}

describe('api menu and customers routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('customers GET/POST cobrem listagem autenticada, validacao, nao encontrado e criacao com endereco', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'cust-list-1',
                name: 'Maria',
                phone: '11999999999',
                cpf: null,
                created_at: '2026-04-01T00:00:00.000Z',
                addresses: [{ id: 'addr-1', city: 'São Paulo' }],
              },
            ],
            error: null,
          }),
        })),
      },
    } as never)
    const listResponse = await customersRoute.GET(
      new Request('https://chefops.test/api/customers') as never,
    )
    expect(listResponse.status).toBe(200)
    await expect(listResponse.json()).resolves.toEqual({
      data: [
        {
          id: 'cust-list-1',
          name: 'Maria',
          phone: '11999999999',
          cpf: null,
          created_at: '2026-04-01T00:00:00.000Z',
          addresses: [{ id: 'addr-1', city: 'São Paulo' }],
        },
      ],
    })

    expect((await customersRoute.GET(
      new Request('https://chefops.test/api/customers?phone=1199') as never,
    )).status).toBe(400)

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'cust-found',
            phone: '11999999999',
            addresses: [{ id: 'addr-found', street: 'Rua B' }],
          },
          error: null,
        }),
      })),
    } as never)
    const foundResponse = await customersRoute.GET(
      new Request('https://chefops.test/api/customers?phone=(11)%2099999-9999&tenant_id=550e8400-e29b-41d4-a716-446655440000') as never,
    )
    expect(foundResponse.status).toBe(200)
    await expect(foundResponse.json()).resolves.toEqual({
      data: {
        id: 'cust-found',
        phone: '11999999999',
        addresses: [{ id: 'addr-found', street: 'Rua B' }],
      },
    })

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
      })),
    } as never)
    const notFoundResponse = await customersRoute.GET(
      new Request('https://chefops.test/api/customers?phone=11999999999&tenant_id=550e8400-e29b-41d4-a716-446655440000') as never,
    )
    expect(notFoundResponse.status).toBe(200)
    await expect(notFoundResponse.json()).resolves.toEqual({ data: null })

    vi.mocked(createAdminClient).mockImplementationOnce(() => {
      throw new Error('admin unavailable')
    })
    expect((await customersRoute.GET(
      new Request('https://chefops.test/api/customers?phone=11999999999&tenant_id=550e8400-e29b-41d4-a716-446655440000') as never,
    )).status).toBe(500)

    expect((await customersRoute.POST(
      new Request('https://chefops.test/api/customers', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: 'bad-id', name: 'A', phone: '123' }),
      }) as never,
    )).status).toBe(400)

    const customerInsertQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'cust-1' }, error: null }),
    }
    const fullCustomerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'cust-1',
          phone: '11999999999',
          addresses: [{ id: 'addr-1', street: 'Rua A' }],
        },
      }),
    }
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            upsert: vi.fn(() => customerInsertQuery),
            select: fullCustomerQuery.select,
            eq: fullCustomerQuery.eq,
            single: fullCustomerQuery.single,
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)

    const response = await customersRoute.POST(
      new Request('https://chefops.test/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Carlos',
          phone: '(11) 99999-9999',
          address: {
            zip_code: '12345678',
            street: 'Rua A',
            number: '10',
            city: 'Sao Paulo',
            state: 'SP',
          },
        }),
      }) as never,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: 'cust-1',
        addresses: [{ id: 'addr-1', street: 'Rua A' }],
      },
    })

    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        upsert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('upsert failed') }),
        })),
      })),
    } as never)
    expect((await customersRoute.POST(
      new Request('https://chefops.test/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Carlos',
          phone: '(11) 99999-9999',
        }),
      }) as never,
    )).status).toBe(500)

    const customerInsertNoAddressQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'cust-2' }, error: null }),
    }
    const fullCustomerNoAddressQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'cust-2',
          phone: '11988887777',
          addresses: [],
        },
      }),
    }
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            upsert: vi.fn(() => customerInsertNoAddressQuery),
            select: fullCustomerNoAddressQuery.select,
            eq: fullCustomerNoAddressQuery.eq,
            single: fullCustomerNoAddressQuery.single,
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)

    const noAddressResponse = await customersRoute.POST(
      new Request('https://chefops.test/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Maria',
          phone: '(11) 98888-7777',
        }),
      }) as never,
    )
    expect(noAddressResponse.status).toBe(201)
    await expect(noAddressResponse.json()).resolves.toMatchObject({
      data: {
        id: 'cust-2',
        addresses: [],
      },
    })

    const customerInsertNullableAddressQuery = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'cust-3' }, error: null }),
    }
    const fullCustomerNullableAddressQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'cust-3',
          phone: '11977776666',
          addresses: [{ id: 'addr-3', label: 'Casa' }],
        },
      }),
    }
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            upsert: vi.fn(() => customerInsertNullableAddressQuery),
            select: fullCustomerNullableAddressQuery.select,
            eq: fullCustomerNullableAddressQuery.eq,
            single: fullCustomerNullableAddressQuery.single,
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)

    const nullableAddressResponse = await customersRoute.POST(
      new Request('https://chefops.test/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Joana',
          phone: '(11) 97777-6666',
          address: {
            zip_code: '12345678',
            street: 'Rua B',
            number: '22',
            complement: null,
            neighborhood: null,
            city: 'Sao Paulo',
            state: 'SP',
            label: null,
          },
        }),
      }) as never,
    )
    expect(nullableAddressResponse.status).toBe(201)
    await expect(nullableAddressResponse.json()).resolves.toMatchObject({
      data: {
        id: 'cust-3',
        addresses: [{ id: 'addr-3', label: 'Casa' }],
      },
    })
  })

  it('menu items GET/POST/PATCH/DELETE cobrem auth, limite de plano, feature gate, 404 e sucesso', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await menuItemsRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn()
            .mockReturnThis()
            .mockImplementationOnce(function () { return this })
            .mockResolvedValueOnce({ data: [{ id: 'item-1' }], error: null }),
        })),
      },
    } as never)
    expect((await menuItemsRoute.GET()).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn()
            .mockReturnThis()
            .mockImplementationOnce(function () { return this })
            .mockResolvedValueOnce({ data: null, error: new Error('list failed') }),
        })),
      },
    } as never)
    expect((await menuItemsRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {},
    } as never)
    expect((await menuItemsRoute.POST(
      new Request('https://chefops.test/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({ name: '', price: -1 }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(401),
    } as never)
    expect((await menuItemsRoute.POST(
      new Request('https://chefops.test/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bloqueado', price: 10, display_order: 1 }),
      }) as never,
    )).status).toBe(401)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 30 }),
        })),
      },
    } as never)
    expect((await menuItemsRoute.POST(
      new Request('https://chefops.test/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({ name: 'Burger', price: 10, display_order: 1 }),
      }) as never,
    )).status).toBe(429)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0 }),
        })),
      },
    } as never)
    expect((await menuItemsRoute.POST(
      new Request('https://chefops.test/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Burger',
          price: 10,
          display_order: 1,
          product_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'menu_items') {
            return {
              select: vi.fn((...args: unknown[]) => {
                if (args.length > 1) {
                  return {
                    eq: vi.fn().mockResolvedValue({ count: null }),
                  }
                }

                return {
                  insert: vi.fn(),
                }
              }),
              eq: vi.fn().mockReturnThis(),
              insert: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'item-fallback' }, error: null }),
              })),
            }
          }

          return {}
        }),
      },
    } as never)
    expect((await menuItemsRoute.POST(
      new Request('https://chefops.test/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Pizza',
          price: 12,
          display_order: 2,
        }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'item-1' }, error: null }),
          })),
        })),
      },
    } as never)
    expect((await menuItemsRoute.POST(
      new Request('https://chefops.test/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Burger',
          price: 10,
          display_order: 1,
          product_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') }),
          })),
        })),
      },
    } as never)
    expect((await menuItemsRoute.POST(
      new Request('https://chefops.test/api/menu-items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Burger',
          price: 10,
          display_order: 1,
        }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await menuItemByIdRoute.PATCH(
      new Request('https://chefops.test/api/menu-items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Novo nome' }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await menuItemByIdRoute.PATCH(
      new Request('https://chefops.test/api/menu-items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ price: -1 }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {},
    } as never)
    expect((await menuItemByIdRoute.PATCH(
      new Request('https://chefops.test/api/menu-items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ product_id: '550e8400-e29b-41d4-a716-446655440000' }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'item-1', product_id: null }, error: null }),
          })),
        })),
      },
    } as never)
    expect((await menuItemByIdRoute.PATCH(
      new Request('https://chefops.test/api/menu-items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ product_id: null }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
          })),
        })),
      },
    } as never)
    expect((await menuItemByIdRoute.PATCH(
      new Request('https://chefops.test/api/menu-items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Novo nome' }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockRejectedValue(new Error('patch failed')),
          })),
        })),
      },
    } as never)
    expect((await menuItemByIdRoute.PATCH(
      new Request('https://chefops.test/api/menu-items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Novo nome' }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'item-1' }, error: null }),
          })),
        })),
      },
    } as never)
    expect((await menuItemByIdRoute.PATCH(
      new Request('https://chefops.test/api/menu-items/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Novo nome' }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
          })),
        })),
      },
    } as never)
    expect((await menuItemByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await menuItemByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => {
          const secondEq = vi.fn().mockResolvedValue({ error: new Error('delete failed') })
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockReturnValue({ eq: secondEq }),
            })),
          }
        }),
      },
    } as never)
    expect((await menuItemByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(500)
  })

  it('menu item extras GET/PUT cobrem erro, limpeza e reinserção', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ extra: { id: 'extra-1', name: 'Catupiry' } }],
          error: null,
        }),
      }),
    } as never)
    const getResponse = await menuItemExtrasRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )
    expect(getResponse.status).toBe(200)
    await expect(getResponse.json()).resolves.toEqual({
      data: [{ id: 'extra-1', name: 'Catupiry' }],
    })

    vi.mocked(createClient).mockResolvedValueOnce({
      from: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('get failed'),
        }),
      }),
    } as never)
    expect((await menuItemExtrasRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(500)

    const deleteEqMock = vi.fn().mockResolvedValue({ error: null })
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: deleteEqMock,
        insert: insertMock,
      })),
    } as never)
    expect((await menuItemExtrasRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/extras', {
        method: 'PUT',
        body: JSON.stringify({ extra_ids: [] }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)
    expect(insertMock).not.toHaveBeenCalled()

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as never)
    expect((await menuItemExtrasRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/extras', {
        method: 'PUT',
        body: JSON.stringify({ extra_ids: ['extra-1', 'extra-2'] }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: new Error('insert failed') }),
      })),
    } as never)
    expect((await menuItemExtrasRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/extras', {
        method: 'PUT',
        body: JSON.stringify({ extra_ids: ['extra-1'] }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(500)
  })

  it('menu item extras GET/PUT cobrem leitura e regravacao dos relacionamentos', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ extra: { id: 'extra-1', name: 'Bacon' } }],
          error: null,
        }),
      })),
    } as never)
    const getResponse = await menuItemExtrasRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )
    expect(getResponse.status).toBe(200)
    await expect(getResponse.json()).resolves.toEqual({
      data: [{ id: 'extra-1', name: 'Bacon' }],
    })

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as never)
    expect((await menuItemExtrasRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/extras', {
        method: 'PUT',
        body: JSON.stringify({ extra_ids: ['extra-1', 'extra-2'] }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)
  })

  it('menu item ingredients GET/PUT cobrem feature gate, validacao e sucesso', async () => {
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await menuItemIngredientsRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'ing-1' }], error: null }),
        })),
      },
    } as never)
    expect((await menuItemIngredientsRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('ingredients failed') }),
        })),
      },
    } as never)
    expect((await menuItemIngredientsRoute.GET(
      {} as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(500)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await menuItemIngredientsRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/ingredients', {
        method: 'PUT',
        body: JSON.stringify({ ingredients: [{ product_id: 'bad-id', quantity: 0 }] }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(400)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(401),
    } as never)
    expect((await menuItemIngredientsRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/ingredients', {
        method: 'PUT',
        body: JSON.stringify({ ingredients: [] }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(401)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: new Error('insert failed') }),
        })),
      },
    } as never)
    expect((await menuItemIngredientsRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/ingredients', {
        method: 'PUT',
        body: JSON.stringify({
          ingredients: [{
            product_id: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          }],
        }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(500)

    const insertSpy = vi.fn()
    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertSpy.mockResolvedValue({ error: null }),
        })),
      },
    } as never)
    expect((await menuItemIngredientsRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/ingredients', {
        method: 'PUT',
        body: JSON.stringify({ ingredients: [] }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)
    expect(insertSpy).not.toHaveBeenCalled()

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: vi.fn(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    } as never)
    expect((await menuItemIngredientsRoute.PUT(
      new Request('https://chefops.test/api/menu-items/item-1/ingredients', {
        method: 'PUT',
        body: JSON.stringify({
          ingredients: [
            {
              product_id: '550e8400-e29b-41d4-a716-446655440000',
              quantity: 2,
            },
          ],
        }),
      }) as never,
      { params: Promise.resolve({ id: 'item-1' }) },
    )).status).toBe(200)
  })
})
