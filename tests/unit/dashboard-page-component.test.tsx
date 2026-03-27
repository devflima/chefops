import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const createClientMock = vi.fn()
const createAdminClientMock = vi.fn()
const hasPlanFeatureMock = vi.fn()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: Record<string, unknown>) => React.createElement('svg', props)
  return {
    ArrowRight: Icon,
    Bike: Icon,
    ClipboardList: Icon,
    Clock3: Icon,
    LayoutGrid: Icon,
    Package: Icon,
    TriangleAlert: Icon,
    TrendingUp: Icon,
    Wallet: Icon,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

vi.mock('@/features/plans/types', async () => {
  const actual = await vi.importActual('@/features/plans/types')
  return {
    ...actual,
    hasPlanFeature: (...args: Parameters<typeof hasPlanFeatureMock>) => hasPlanFeatureMock(...args),
  }
})

vi.mock('@/features/onboarding/components/OnboardingWizard', () => ({
  default: () => React.createElement('div', null, 'Onboarding Wizard'),
}))

function queryBuilder(resolvedData: unknown) {
  return {
    select: vi.fn(() => queryBuilder(resolvedData)),
    eq: vi.fn(() => queryBuilder(resolvedData)),
    gte: vi.fn(() => queryBuilder(resolvedData)),
    order: vi.fn(() => queryBuilder(resolvedData)),
    limit: vi.fn(async () => ({ data: resolvedData })),
    single: vi.fn(async () => ({ data: resolvedData })),
    maybeSingle: vi.fn(async () => ({ data: resolvedData })),
    then: (resolve: (value: { data: unknown }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: resolvedData }).then(resolve, reject),
  }
}

describe('DashboardPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza resumo da operacao com top entregador e alertas de estoque', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('basic')
      return ['orders', 'tables', 'stock', 'sales'].includes(feature)
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder({
            full_name: 'Maria Silva',
            tenant_id: 'tenant-1',
            tenants: { name: 'ChefOps House', plan: 'basic' },
          })
        }

        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-1',
              order_number: 41,
              customer_name: 'Ana',
              status: 'pending',
              payment_status: 'pending',
              payment_method: 'delivery',
              total: 32,
              delivery_fee: 6,
              delivery_status: 'waiting_dispatch',
              delivery_driver_id: null,
              created_at: '2026-03-22T12:00:00.000Z',
            },
            {
              id: 'order-2',
              order_number: 42,
              customer_name: 'Carlos',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 58,
              delivery_fee: 8,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-1',
              created_at: '2026-03-22T13:00:00.000Z',
            },
            {
              id: 'order-3',
              order_number: 43,
              customer_name: null,
              status: 'ready',
              payment_status: 'paid',
              payment_method: 'counter',
              total: 40,
              delivery_fee: null,
              delivery_status: null,
              delivery_driver_id: null,
              created_at: '2026-03-22T14:00:00.000Z',
            },
          ])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder({ name: 'João Motta' })
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'stock_balance') {
          return queryBuilder([
            {
              tenant_id: 'tenant-1',
              product_name: 'Molho',
              current_stock: 2,
              min_stock: 5,
              unit: 'kg',
              active: true,
            },
          ])
        }

        throw new Error(`Unexpected admin table ${table}`)
      }),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Maria')
    expect(markup).toContain('ChefOps House')
    expect(markup).toContain('Onboarding Wizard')
    expect(markup).toContain('Pedidos hoje')
    expect(markup).toContain('Faturamento do dia')
    expect(markup).toContain('Ticket médio')
    expect(markup).toContain('Delivery hoje')
    expect(markup).toContain('João Motta com 1 entrega')
    expect(markup).toContain('Molho')
    expect(markup).toContain('Ver pedidos')
    expect(markup).toContain('Checar estoque')
    expect(markup).toContain('Pedidos que exigem atenção')
    expect(markup).toContain('R$ 8,00')
    expect(markup).not.toContain('R$ 14,00')
  })

  it('renderiza estados vazios quando nao ha estoque e entregas concluidas', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('free')
      return feature === 'sales' ? false : false
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-1' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder({
            full_name: 'Paulo Souza',
            tenant_id: 'tenant-2',
            tenants: { name: 'Balcao Central', plan: 'free' },
          })
        }

        if (table === 'orders') {
          return queryBuilder([])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder(null)
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder([])),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Paulo')
    expect(markup).toContain('Balcao Central')
    expect(markup).toContain('Nenhuma entrega concluída hoje')
    expect(markup).toContain('Nada crítico no momento. A operação está fluindo bem.')
    expect(markup).toContain('O controle de estoque completo está disponível a partir do plano Standard.')
    expect(markup).toContain('Ainda sem vendas concluídas')
    expect(markup).toContain('Disponível no painel operacional')
    expect(markup).not.toContain('Abrir mesas')
    expect(markup).not.toContain('Checar estoque')
    expect(markup).not.toContain('Gerir entregadores')
  })

  it('cobre estoque habilitado sem alerta crítico e top entregador sem nome disponível', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('basic')
      return ['orders', 'tables', 'stock', 'sales'].includes(feature)
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-2' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder({
            full_name: 'Lucas Pereira',
            tenant_id: 'tenant-3',
            tenants: [{ name: 'Casa Nova', plan: 'basic' }],
          })
        }

        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-10',
              order_number: 101,
              customer_name: 'Bianca',
              status: 'confirmed',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 47,
              delivery_fee: 7,
              delivery_status: 'assigned',
              delivery_driver_id: 'driver-77',
              created_at: '2026-03-22T15:00:00.000Z',
            },
            {
              id: 'order-11',
              order_number: 102,
              customer_name: 'Rafa',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 59,
              delivery_fee: 9,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-77',
              created_at: '2026-03-22T16:00:00.000Z',
            },
          ])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder({ name: null })
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'stock_balance') {
          return queryBuilder([
            {
              tenant_id: 'tenant-3',
              product_name: 'Queijo',
              current_stock: 8,
              min_stock: 5,
              unit: 'kg',
              active: true,
            },
          ])
        }

        throw new Error(`Unexpected admin table ${table}`)
      }),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Lucas')
    expect(markup).toContain('Casa Nova')
    expect(markup).toContain('Nenhuma entrega concluída hoje')
    expect(markup).toContain('Nenhum item com estoque crítico agora.')
    expect(markup).toContain('2 pedidos pagos')
    expect(markup).toContain('2 vendas concluídas')
    expect(markup).not.toContain('Ainda sem pedidos entregues')
    expect(markup).toContain('Nada crítico no momento. A operação está fluindo bem.')
    expect(markup).not.toContain('Queijo')
  })

  it('cobre plural do top entregador e detalhes de atenção com entrega em rota', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('basic')
      return ['orders', 'tables', 'stock', 'sales'].includes(feature)
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-3' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder({
            full_name: 'Renata Souza',
            tenant_id: 'tenant-4',
            tenants: { name: 'Pizzaria Centro', plan: 'basic' },
          })
        }

        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-20',
              order_number: 201,
              customer_name: null,
              status: 'pending',
              payment_status: 'pending',
              payment_method: 'delivery',
              total: 39,
              delivery_fee: 5,
              delivery_status: 'out_for_delivery',
              delivery_driver_id: 'driver-9',
              created_at: '2026-03-22T18:30:00.000Z',
            },
            {
              id: 'order-21',
              order_number: 202,
              customer_name: 'Duda',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 55,
              delivery_fee: 6,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-9',
              created_at: '2026-03-22T19:00:00.000Z',
            },
            {
              id: 'order-22',
              order_number: 203,
              customer_name: 'Marcos',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 61,
              delivery_fee: 7,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-9',
              created_at: '2026-03-22T19:20:00.000Z',
            },
          ])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder({ name: 'Clara Lima' })
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'stock_balance') {
          return queryBuilder([])
        }

        throw new Error(`Unexpected admin table ${table}`)
      }),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Renata')
    expect(markup).toContain('Clara Lima com 2 entregas')
    expect(markup).toContain('#201')
    expect(markup).toContain('Aguardando')
    expect(markup).toContain('Saiu para entrega')
    expect(markup).toContain('R$ 39,00')
    expect(markup).toContain('2 vendas concluídas')
  })

  it('ordena entregadores concluídos para destacar o líder do dia', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('basic')
      return ['orders', 'tables', 'stock', 'sales'].includes(feature)
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-sort' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder({
            full_name: 'Marina Costa',
            tenant_id: 'tenant-sort',
            tenants: { name: 'Casa Sort', plan: 'basic' },
          })
        }

        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-s1',
              order_number: 501,
              customer_name: 'Ana',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 35,
              delivery_fee: 5,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-a',
              created_at: '2026-03-22T12:00:00.000Z',
            },
            {
              id: 'order-s2',
              order_number: 502,
              customer_name: 'Bia',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 42,
              delivery_fee: 6,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-b',
              created_at: '2026-03-22T12:30:00.000Z',
            },
            {
              id: 'order-s3',
              order_number: 503,
              customer_name: 'Caio',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 48,
              delivery_fee: 7,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-b',
              created_at: '2026-03-22T13:00:00.000Z',
            },
          ])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder({ name: 'Bruno Dias' })
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder([])),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Marina')
    expect(markup).toContain('Casa Sort')
    expect(markup).toContain('Bruno Dias com 2 entregas')
  })

  it('cobre fallbacks com perfil ausente, pedidos nulos e estoque nulo', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('free')
      return feature === 'stock'
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-4' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder(null)
        }

        if (table === 'orders') {
          return queryBuilder(null)
        }

        if (table === 'delivery_drivers') {
          return queryBuilder(null)
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'stock_balance') {
          return queryBuilder(null)
        }

        throw new Error(`Unexpected admin table ${table}`)
      }),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Olá, !')
    expect(markup).toContain('Nenhuma entrega concluída hoje')
    expect(markup).toContain('0 em andamento')
    expect(markup).toContain('Disponível no painel operacional')
    expect(markup).toContain('Nenhum item com estoque crítico agora.')
    expect(markup).toContain('Nada crítico no momento. A operação está fluindo bem.')
  })

  it('cobre tenant em array vazio e soma taxa de entrega com fallback nulo', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('free')
      return feature === 'sales'
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-5' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder({
            full_name: 'Carla Dias',
            tenant_id: 'tenant-5',
            tenants: [],
          })
        }

        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-30',
              order_number: 301,
              customer_name: 'Lia',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 25,
              delivery_fee: null,
              delivery_status: 'delivered',
              delivery_driver_id: null,
              created_at: '2026-03-22T12:00:00.000Z',
            },
            {
              id: 'order-31',
              order_number: 302,
              customer_name: 'Beto',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 45,
              delivery_fee: 7,
              delivery_status: 'delivered',
              delivery_driver_id: null,
              created_at: '2026-03-22T13:00:00.000Z',
            },
          ])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder(null)
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder([])),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Carla')
    expect(markup).toContain('Visão rápida da operação do')
    expect(markup).toContain('R$ 7,00')
    expect(markup).toContain('2 pedidos pagos')
    expect(markup).toContain('2 vendas concluídas')
  })

  it('cobre perfil com tenant nulo no fallback da normalizacao', async () => {
    hasPlanFeatureMock.mockImplementation((plan: string, feature: string) => {
      expect(plan).toBe('free')
      return feature === 'sales'
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-6' } },
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return queryBuilder({
            full_name: 'Luna Rocha',
            tenant_id: 'tenant-6',
            tenants: null,
          })
        }

        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-40',
              order_number: 401,
              customer_name: 'Nina',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'counter',
              total: 18,
              delivery_fee: null,
              delivery_status: null,
              delivery_driver_id: null,
              created_at: '2026-03-22T11:00:00.000Z',
            },
          ])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder(null)
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => queryBuilder([])),
    })

    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')
    const markup = renderToStaticMarkup(await DashboardPage())

    expect(markup).toContain('Luna')
    expect(markup).toContain('Visão rápida da operação do')
    expect(markup).toContain('1 pedidos pagos')
    expect(markup).toContain('O controle de estoque completo está disponível a partir do plano Standard.')
  })
})
