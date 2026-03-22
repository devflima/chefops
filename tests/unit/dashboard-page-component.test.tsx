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
      return feature === 'stock' || feature === 'sales'
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
    expect(markup).toContain('Ainda sem pedidos entregues')
    expect(markup).toContain('Disponível no painel operacional')
  })
})
