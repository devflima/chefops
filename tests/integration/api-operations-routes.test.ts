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

const { requireTenantRoles } = await import('@/lib/auth-guards')
const { requireTenantFeature } = await import('@/lib/auth-guards')
const { createClient } = await import('@/lib/supabase/server')
const { createAdminClient } = await import('@/lib/supabase/admin')

const deliverySettingsRoute = await import('@/app/api/delivery-settings/route')
const deliveryDriversRoute = await import('@/app/api/delivery-drivers/route')
const deliveryDriverByIdRoute = await import('@/app/api/delivery-drivers/[id]/route')
const tabsRoute = await import('@/app/api/tabs/route')
const tabByIdRoute = await import('@/app/api/tabs/[id]/route')
const tablesRoute = await import('@/app/api/tables/route')
const tableByIdRoute = await import('@/app/api/tables/[id]/route')

function forbiddenResponse(status = 403) {
  return new Response(JSON.stringify({ error: 'forbidden' }), { status })
}

describe('api operations routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireTenantFeature).mockImplementation(async (...args: unknown[]) => {
      const allowedRoles = args[1] as unknown[] | undefined
      return vi.mocked(requireTenantRoles).getMockImplementation()
        ? (requireTenantRoles as unknown as (...params: unknown[]) => unknown)(allowedRoles)
        : { ok: false, response: forbiddenResponse() }
    })
  })

  it('delivery settings GET/PATCH cobrem criacao automatica, validacao e sucesso', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await deliverySettingsRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-1', delivery_enabled: false, flat_fee: 0, accepting_orders: true, schedule_enabled: false, opens_at: null, closes_at: null, pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null },
            error: null,
          }),
        })),
      })),
    } as never)
    expect((await deliverySettingsRoute.GET()).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await deliverySettingsRoute.PATCH(
      new Request('https://chefops.test/api/delivery-settings', {
        method: 'PATCH',
        body: JSON.stringify({ delivery_enabled: true, flat_fee: 9.5, accepting_orders: false, schedule_enabled: true, opens_at: '09:00', closes_at: '18:00', pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    expect((await deliverySettingsRoute.PATCH(
      new Request('https://chefops.test/api/delivery-settings', {
        method: 'PATCH',
        body: JSON.stringify({ delivery_enabled: true, flat_fee: 1000, accepting_orders: true, schedule_enabled: false, opens_at: null, closes_at: null, pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    const updateQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { tenant_id: 'tenant-1', delivery_enabled: true, flat_fee: 9.5, accepting_orders: false, schedule_enabled: true, opens_at: '09:00', closes_at: '18:00', pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null },
        error: null,
      }),
    }
    const deliverySettingsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1', accepting_orders: true, schedule_enabled: false, opens_at: null, closes_at: null, pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null }, error: null }),
      update: vi.fn(() => updateQuery),
    }
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => deliverySettingsQuery),
    } as never)
    expect((await deliverySettingsRoute.PATCH(
      new Request('https://chefops.test/api/delivery-settings', {
        method: 'PATCH',
        body: JSON.stringify({ delivery_enabled: true, flat_fee: 9.5, accepting_orders: false, schedule_enabled: true, opens_at: '09:00', closes_at: '18:00', pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null }),
      }) as never,
    )).status).toBe(200)
  })

  it('delivery drivers GET/POST/PATCH/DELETE cobrem validacao, 404 e sucesso', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({ data: [{ id: 'driver-1', name: 'Carlos' }], error: null }).then(resolve)
          },
        }),
      },
    } as never)
    expect((await deliveryDriversRoute.GET()).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(401),
    } as never)
    expect((await deliveryDriversRoute.GET()).status).toBe(401)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve({ data: null, error: new Error('db down') }).then(resolve)
          },
        }),
      },
    } as never)
    expect((await deliveryDriversRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await deliveryDriversRoute.POST(
      new Request('https://chefops.test/api/delivery-drivers', {
        method: 'POST',
        body: JSON.stringify({ name: 'A', vehicle_type: 'moto' }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'driver-1' }, error: null }),
          })),
        }),
      },
    } as never)
    expect((await deliveryDriversRoute.POST(
      new Request('https://chefops.test/api/delivery-drivers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Carlos', vehicle_type: 'moto', active: true }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await deliveryDriversRoute.POST(
      new Request('https://chefops.test/api/delivery-drivers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Carlos', vehicle_type: 'moto' }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') }),
          })),
        }),
      },
    } as never)
    expect((await deliveryDriversRoute.POST(
      new Request('https://chefops.test/api/delivery-drivers', {
        method: 'POST',
        body: JSON.stringify({
          name: '  Carlos  ',
          phone: '   ',
          notes: '   ',
          vehicle_type: 'moto',
        }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
          })),
        }),
      },
    } as never)
    expect((await deliveryDriverByIdRoute.PATCH(
      new Request('https://chefops.test/api/delivery-drivers/driver-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Carlos' }),
      }) as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await deliveryDriverByIdRoute.PATCH(
      new Request('https://chefops.test/api/delivery-drivers/driver-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'A' }),
      }) as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await deliveryDriverByIdRoute.PATCH(
      new Request('https://chefops.test/api/delivery-drivers/driver-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Carlos' }),
      }) as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(403)

    const updateSpy = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'driver-1',
          name: 'Carlos',
          phone: null,
          notes: null,
          vehicle_type: 'moto',
          active: false,
        },
        error: null,
      }),
    }))
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          update: updateSpy,
        }),
      },
    } as never)
    expect((await deliveryDriverByIdRoute.PATCH(
      new Request('https://chefops.test/api/delivery-drivers/driver-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: '  Carlos  ',
          phone: '   ',
          notes: '   ',
          vehicle_type: 'moto',
          active: false,
        }),
      }) as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith({
      name: 'Carlos',
      phone: null,
      notes: null,
      vehicle_type: 'moto',
      active: false,
    })

    const partialUpdateSpy = vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'driver-1',
          phone: '11999999999',
          notes: 'turno noite',
        },
        error: null,
      }),
    }))
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          update: partialUpdateSpy,
        }),
      },
    } as never)
    expect((await deliveryDriverByIdRoute.PATCH(
      new Request('https://chefops.test/api/delivery-drivers/driver-1', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: ' 11999999999 ',
          notes: '  turno noite  ',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(200)
    expect(partialUpdateSpy).toHaveBeenCalledWith({
      phone: '11999999999',
      notes: 'turno noite',
    })

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
    expect((await deliveryDriverByIdRoute.PATCH(
      new Request('https://chefops.test/api/delivery-drivers/driver-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Carlos', phone: ' 11999999999 ', notes: '  noite  ' }),
      }) as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'driver-1' }, error: null }),
        }),
      },
    } as never)
    expect((await deliveryDriverByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }),
        }),
      },
    } as never)
    expect((await deliveryDriverByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(404)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockRejectedValue(new Error('delete failed')),
        }),
      },
    } as never)
    expect((await deliveryDriverByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await deliveryDriverByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'driver-1' }) },
    )).status).toBe(403)
  })

  it('tabs GET/POST/PATCH cobrem conflitos, validacao, auth e fechamento', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(401),
    } as never)
    expect((await tabsRoute.GET(
      { nextUrl: new URL('https://chefops.test/api/tabs?status=open') } as never,
    )).status).toBe(401)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'tab-1' }], error: null }),
        }),
      },
    } as never)
    expect((await tabsRoute.GET(
      { nextUrl: new URL('https://chefops.test/api/tabs?status=open') } as never,
    )).status).toBe(200)

    const defaultStatusQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'tab-default' }], error: null }),
    }
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => defaultStatusQuery,
      },
    } as never)
    expect((await tabsRoute.GET(
      { nextUrl: new URL('https://chefops.test/api/tabs') } as never,
    )).status).toBe(200)
    expect(defaultStatusQuery.eq).toHaveBeenCalledWith('status', 'open')

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('tabs failed') }),
        }),
      },
    } as never)
    expect((await tabsRoute.GET(
      { nextUrl: new URL('https://chefops.test/api/tabs?status=closed') } as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {},
    } as never)
    expect((await tabsRoute.POST(
      new Request('https://chefops.test/api/tabs', {
        method: 'POST',
        body: JSON.stringify({ label: '' }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await tabsRoute.POST(
      new Request('https://chefops.test/api/tabs', {
        method: 'POST',
        body: JSON.stringify({ label: 'A0' }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'tab-1' } }),
        }),
      },
    } as never)
    expect((await tabsRoute.POST(
      new Request('https://chefops.test/api/tabs', {
        method: 'POST',
        body: JSON.stringify({ label: 'A1' }),
      }) as never,
    )).status).toBe(409)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'tab-2', label: 'A2', notes: 'Observação' },
              error: null,
            }),
          })),
        }),
      },
    } as never)
    expect((await tabsRoute.POST(
      new Request('https://chefops.test/api/tabs', {
        method: 'POST',
        body: JSON.stringify({ label: '  A2  ', notes: '  Observação  ' }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      user: { id: 'user-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
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
    expect((await tabsRoute.POST(
      new Request('https://chefops.test/api/tabs', {
        method: 'POST',
        body: JSON.stringify({ label: 'A3' }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      })),
    } as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-1' }) },
    )).status).toBe(404)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-1' }) },
    )).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: { id: 'tab-1', orders: [{ total: 10 }, { total: 15 }] },
          })
          .mockResolvedValueOnce({
            data: { id: 'tab-1', total: 25 },
            error: null,
          }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'tab-1', total: 25 }, error: null }),
        })),
      })),
    } as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValueOnce({
          data: { id: 'tab-1', orders: [{ total: 10 }] },
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') }),
        })),
      })),
    } as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-1' }) },
    )).status).toBe(500)
  })

  it('delivery settings cobrem falhas na criacao e no update', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('lookup failed') }),
      })),
    } as never)
    expect((await deliverySettingsRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('create failed') }),
        })),
      })),
    } as never)
    expect((await deliverySettingsRoute.PATCH(
      new Request('https://chefops.test/api/delivery-settings', {
        method: 'PATCH',
        body: JSON.stringify({ delivery_enabled: false, flat_fee: 3, accepting_orders: false, schedule_enabled: false, opens_at: null, closes_at: null, pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    } as never)
    expect((await deliverySettingsRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
    } as never)
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1', accepting_orders: true, schedule_enabled: false, opens_at: null, closes_at: null, pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null }, error: null }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('update failed') }),
        })),
      })),
    } as never)
    expect((await deliverySettingsRoute.PATCH(
      new Request('https://chefops.test/api/delivery-settings', {
        method: 'PATCH',
        body: JSON.stringify({ delivery_enabled: false, flat_fee: 3, accepting_orders: false, schedule_enabled: false, opens_at: null, closes_at: null, pricing_mode: 'flat', max_radius_km: null, fee_per_km: null, origin_zip_code: null, origin_street: null, origin_number: null, origin_neighborhood: null, origin_city: null, origin_state: null }),
      }) as never,
    )).status).toBe(500)
  })

  it('tables GET/POST/PATCH/DELETE cobrem limite, conflito, sessao aberta e sucesso', async () => {
    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(401),
    } as never)
    expect((await tablesRoute.GET()).status).toBe(401)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'table-1',
                active_session: [{ id: 'sess-1', status: 'open', orders: [{ total: 10 }, { total: 15 }] }],
              },
            ],
            error: null,
          }),
        }),
      },
    } as never)
    expect((await tablesRoute.GET()).status).toBe(200)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'table-2',
                active_session: { id: 'sess-closed', status: 'closed', orders: [{ total: 8 }] },
              },
            ],
            error: null,
          }),
        }),
      },
    } as never)
    const tablesWithoutOpenSession = await tablesRoute.GET()
    expect(tablesWithoutOpenSession.status).toBe(200)
    await expect(tablesWithoutOpenSession.json()).resolves.toMatchObject({
      data: [{ id: 'table-2', active_session: null }],
    })

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'table-3',
                active_session: [
                  { id: 'sess-closed-1', status: 'closed', orders: [{ total: 8 }] },
                  { id: 'sess-closed-2', status: 'cancelled', orders: [{ total: 12 }] },
                ],
              },
            ],
            error: null,
          }),
        }),
      },
    } as never)
    const tablesWithClosedArraySessions = await tablesRoute.GET()
    expect(tablesWithClosedArraySessions.status).toBe(200)
    await expect(tablesWithClosedArraySessions.json()).resolves.toMatchObject({
      data: [{ id: 'table-3', active_session: null }],
    })

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {
        from: () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('tables failed'),
          }),
        }),
      },
    } as never)
    expect((await tablesRoute.GET()).status).toBe(500)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1' },
      supabase: {},
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '', capacity: 0 }),
      }) as never,
    )).status).toBe(400)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await tablesRoute.GET()).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '10', capacity: 4 }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: false,
      response: forbiddenResponse(),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '10', capacity: 4 }),
      }) as never,
    )).status).toBe(403)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'basic' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 10 }),
        })),
      },
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '10', capacity: 4 }),
      }) as never,
    )).status).toBe(429)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'free' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({}),
        })),
      },
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '10A', capacity: 4 }),
      }) as never,
    )).status).toBe(429)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0 }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tables') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'table-2', number: '11', capacity: 4 },
                error: null,
              }),
            })),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '11', capacity: 4 }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'basic' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: null }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tables') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'table-2b', number: '11B', capacity: 6 },
                error: null,
              }),
            })),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '11-finite-below-limit', capacity: 4 }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'basic' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 1 }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tables') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'table-2finite', number: '11-finite-below-limit', capacity: 4 },
                error: null,
              }),
            })),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '11-null-tenant', capacity: 5 }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'basic' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: undefined }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tables') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'table-undefined-count', number: '11-undef', capacity: 4 },
                error: null,
              }),
            })),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '11-undef', capacity: 4 }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 999 }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tables') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'table-2c', number: '11-null-tenant', capacity: 5 },
                error: null,
              }),
            })),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '11B', capacity: 6 }),
      }) as never,
    )).status).toBe(201)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0 }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tables') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23505' },
              }),
            })),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '11', capacity: 4 }),
      }) as never,
    )).status).toBe(409)

    vi.mocked(requireTenantRoles).mockResolvedValueOnce({
      ok: true,
      profile: { tenant_id: 'tenant-1', tenant: { plan: 'pro' } },
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0 }),
        })),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tables') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('insert failed'),
              }),
            })),
          }
        }

        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as never)
    expect((await tablesRoute.POST(
      new Request('https://chefops.test/api/tables', {
        method: 'POST',
        body: JSON.stringify({ number: '12', capacity: 4 }),
      }) as never,
    )).status).toBe(500)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      supabase: {
        from: () => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'table-1' }, error: null }),
          })),
        }),
      },
    } as never)
    expect((await tableByIdRoute.PATCH(
      new Request('https://chefops.test/api/tables/table-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'reserved' }),
      }) as never,
      { params: Promise.resolve({ id: 'table-1' }) },
    )).status).toBe(200)

    vi.mocked(requireTenantFeature).mockResolvedValueOnce({
      ok: true,
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'table_sessions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'sess-1' } }),
            }
          }

          return {}
        }),
      },
    } as never)
    expect((await tableByIdRoute.DELETE(
      {} as never,
      { params: Promise.resolve({ id: 'table-1' }) },
    )).status).toBe(422)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-invalid', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'noop' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-invalid' }) },
    )).status).toBe(400)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-1' }) },
    )).status).toBe(401)

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: { id: 'tab-1', orders: null },
          })
          .mockResolvedValueOnce({
            data: { id: 'tab-1', total: 0 },
            error: null,
          }),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'tab-1', total: 0 },
            error: null,
          }),
        })),
      })),
    } as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-1' }) },
    )).status).toBe(200)

    vi.mocked(createClient).mockRejectedValueOnce(new Error('tabs failed') as never)
    expect((await tabByIdRoute.PATCH(
      new Request('https://chefops.test/api/tabs/tab-500', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      }) as never,
      { params: Promise.resolve({ id: 'tab-500' }) },
    )).status).toBe(500)
  })
})
