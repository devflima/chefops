import React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const useRouterMock = vi.fn()
const useSearchParamsMock = vi.fn()
const usePathnameMock = vi.fn()
const redirectMock = vi.fn()
const useSalesMetricsMock = vi.fn()
const usePlanMock = vi.fn()
const useHasFeatureMock = vi.fn()
const useCanAddMoreMock = vi.fn()
const useQueryMock = vi.fn()
const useMercadoPagoAccountMock = vi.fn()
const useDisconnectMercadoPagoAccountMock = vi.fn()
const useCategoriesMock = vi.fn()
const useProductsMock = vi.fn()
const useCreateProductMock = vi.fn()
const useUpdateProductMock = vi.fn()
const useStockBalanceMock = vi.fn()
const useStockMovementsMock = vi.fn()
const useCreateMovementMock = vi.fn()
const useCloseDayMock = vi.fn()
const useNotificationSettingsMock = vi.fn()
const useUpdateNotificationSettingsMock = vi.fn()
const useDeliverySettingsMock = vi.fn()
const useUpdateDeliverySettingsMock = vi.fn()
const useDeliveryDriversMock = vi.fn()
const useCreateDeliveryDriverMock = vi.fn()
const useUpdateDeliveryDriverMock = vi.fn()
const useDeleteDeliveryDriverMock = vi.fn()
const useOrdersMock = vi.fn()
const useUsersListMock = vi.fn()
const useCreateUserMock = vi.fn()
const useUpdateUserRoleMock = vi.fn()
const useDeleteUserMock = vi.fn()
const useUserMock = vi.fn()
const useKDSOrdersMock = vi.fn()
const useUpdateOrderStatusMock = vi.fn()
const useMenuItemsMock = vi.fn()
const useCreateMenuItemMock = vi.fn()
const useTablesMock = vi.fn()
const useCreateTableMock = vi.fn()
const useUpdateTableMock = vi.fn()
const useDeleteTableMock = vi.fn()
const useOpenSessionMock = vi.fn()
const useCloseSessionMock = vi.fn()
const useTabsMock = vi.fn()
const useCreateTabMock = vi.fn()
const useCloseTabMock = vi.fn()
const createClientMock = vi.fn()
const createAdminClientMock = vi.fn()
const hasPlanFeatureMock = vi.fn()
const queryClientMock = {
  invalidateQueries: vi.fn(),
}

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  useQueryClient: () => queryClientMock,
  useQuery: (...args: Parameters<typeof useQueryMock>) => useQueryMock(...args),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('next/image', () => ({
  default: ({ alt, src, ...props }: { alt: string; src: string; priority?: boolean }) =>
    React.createElement('img', { alt, src, ...props }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock(),
  useSearchParams: () => useSearchParamsMock(),
  usePathname: () => usePathnameMock(),
  redirect: (...args: Parameters<typeof redirectMock>) => redirectMock(...args),
}))

vi.mock('lucide-react', () => {
  const Icon = ({ children, ...props }: React.SVGProps<SVGSVGElement>) =>
    React.createElement('svg', props, children)

  return {
    ArrowRight: Icon,
    ArrowLeftRight: Icon,
    AlertTriangle: Icon,
    ArrowDown: Icon,
    ArrowUp: Icon,
    BarChart2: Icon,
    Bike: Icon,
    Building2: Icon,
    Calendar: Icon,
    Check: Icon,
    ChefHat: Icon,
    ChevronDownIcon: Icon,
    ClipboardList: Icon,
    Clock: Icon,
    Clock3: Icon,
    Download: Icon,
    GlassWater: Icon,
    Landmark: Icon,
    LayoutGrid: Icon,
    LayoutDashboard: Icon,
    Link2: Icon,
    LogOut: Icon,
    MonitorCheck: Icon,
    Package: Icon,
    Pencil: Icon,
    Plus: Icon,
    ShieldCheck: Icon,
    ShoppingBag: Icon,
    Settings: Icon,
    Shield: Icon,
    Tag: Icon,
    Trash2: Icon,
    TrendingUp: Icon,
    TriangleAlert: Icon,
    Unplug: Icon,
    Users: Icon,
    UtensilsCrossed: Icon,
    Wallet: Icon,
    X: Icon,
    XCircle: Icon,
    CreditCard: Icon,
    PlugZap: Icon,
    ReceiptText: Icon,
  }
})

vi.mock('@/components/ui/sonner', () => ({
  Toaster: (props: Record<string, unknown>) => React.createElement('div', { 'data-toaster': 'true', ...props }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogContent: ({ children }: React.PropsWithChildren) => React.createElement('section', null, children),
  DialogHeader: ({ children }: React.PropsWithChildren) => React.createElement('header', null, children),
  DialogTitle: ({ children }: React.PropsWithChildren) => React.createElement('h2', null, children),
  DialogTrigger: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
}))

vi.mock('@/features/orders/hooks/useOrders', () => ({
  useMenuItems: () => useMenuItemsMock(),
  useCreateMenuItem: () => useCreateMenuItemMock(),
  useOrders: (...args: Parameters<typeof useOrdersMock>) => useOrdersMock(...args),
  useSalesMetrics: (period: 'today' | 'month') => useSalesMetricsMock(period),
  useKDSOrders: () => useKDSOrdersMock(),
  useUpdateOrderStatus: () => useUpdateOrderStatusMock(),
}))

vi.mock('@/features/stock/hooks/useStock', () => ({
  useStockBalance: () => useStockBalanceMock(),
  useStockMovements: () => useStockMovementsMock(),
  useCreateMovement: () => useCreateMovementMock(),
  useCloseDay: () => useCloseDayMock(),
}))

vi.mock('@/features/plans/hooks/usePlan', async () => {
  const actual = await vi.importActual('@/features/plans/hooks/usePlan')
  return {
    ...actual,
    usePlan: () => usePlanMock(),
    useHasFeature: (feature: string) => useHasFeatureMock(feature),
    useCanAddMore: (...args: Parameters<typeof useCanAddMoreMock>) => useCanAddMoreMock(...args),
  }
})

vi.mock('@/features/payments/hooks/useMercadoPagoAccount', () => ({
  useMercadoPagoAccount: () => useMercadoPagoAccountMock(),
  useDisconnectMercadoPagoAccount: () => useDisconnectMercadoPagoAccountMock(),
}))

vi.mock('@/features/products/hooks/useProducts', () => ({
  useCategories: () => useCategoriesMock(),
  useProducts: () => useProductsMock(),
  useCreateProduct: () => useCreateProductMock(),
  useUpdateProduct: () => useUpdateProductMock(),
}))

vi.mock('@/features/notifications/hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => useNotificationSettingsMock(),
  useUpdateNotificationSettings: () => useUpdateNotificationSettingsMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliverySettings', () => ({
  useDeliverySettings: () => useDeliverySettingsMock(),
  useUpdateDeliverySettings: () => useUpdateDeliverySettingsMock(),
}))

vi.mock('@/features/delivery/hooks/useDeliveryDrivers', () => ({
  useDeliveryDrivers: () => useDeliveryDriversMock(),
  useCreateDeliveryDriver: () => useCreateDeliveryDriverMock(),
  useUpdateDeliveryDriver: () => useUpdateDeliveryDriverMock(),
  useDeleteDeliveryDriver: () => useDeleteDeliveryDriverMock(),
}))

vi.mock('@/features/users/hooks/useUsers', () => ({
  useUsers: () => useUsersListMock(),
  useCreateUser: () => useCreateUserMock(),
  useUpdateUserRole: () => useUpdateUserRoleMock(),
  useDeleteUser: () => useDeleteUserMock(),
}))

vi.mock('@/features/auth/hooks/useUser', () => ({
  useUser: () => useUserMock(),
}))

vi.mock('@/features/tables/hooks/useTables', () => ({
  useTables: () => useTablesMock(),
  useCreateTable: () => useCreateTableMock(),
  useUpdateTable: () => useUpdateTableMock(),
  useDeleteTable: () => useDeleteTableMock(),
  useOpenSession: () => useOpenSessionMock(),
  useCloseSession: () => useCloseSessionMock(),
}))

vi.mock('@/features/tabs/hooks/useTabs', () => ({
  useTabs: (...args: Parameters<typeof useTabsMock>) => useTabsMock(...args),
  useCreateTab: () => useCreateTabMock(),
  useCloseTab: () => useCloseTabMock(),
}))

vi.mock('@/features/orders/components/ManualOrderDialog', () => ({
  default: () => React.createElement('div', null, 'Manual Order Dialog'),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClientMock(),
}))

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
    then: undefined,
  }
}

describe('page smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useRouterMock.mockReturnValue({
      push: vi.fn(),
      refresh: vi.fn(),
    })
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
    usePathnameMock.mockReturnValue('/dashboard')
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`)
    })
    useSalesMetricsMock.mockReturnValue({
      data: {
        revenue: 320,
        delivered: 10,
        average_ticket: 32,
        cancelled: 1,
        pending: 2,
        cancellation_rate: 10,
      },
      isLoading: false,
    })
    usePlanMock.mockReturnValue({ data: { plan: 'basic' } })
    useHasFeatureMock.mockReturnValue(true)
    useCanAddMoreMock.mockReturnValue(true)
    useMercadoPagoAccountMock.mockReturnValue({
      data: null,
      isLoading: false,
    })
    useCategoriesMock.mockReturnValue({
      data: [
        {
          id: 'cat-1',
          tenant_id: 'tenant-1',
          name: 'Bebidas',
          display_order: 1,
          created_at: '2026-03-21T00:00:00.000Z',
          goes_to_kitchen: false,
        },
        {
          id: 'cat-2',
          tenant_id: 'tenant-1',
          name: 'Pratos',
          display_order: 2,
          created_at: '2026-03-21T00:00:00.000Z',
          goes_to_kitchen: true,
        },
      ],
      isLoading: false,
    })
    useProductsMock.mockReturnValue({
      data: {
        count: 2,
        data: [
          {
            id: 'prod-1',
            tenant_id: 'tenant-1',
            category_id: 'cat-1',
            name: 'Farinha',
            sku: 'FR-01',
            unit: 'kg',
            cost_price: 12.5,
            min_stock: 3,
            active: true,
            created_at: '2026-03-21T00:00:00.000Z',
            updated_at: '2026-03-21T00:00:00.000Z',
            category: { name: 'Bebidas' },
          },
          {
            id: 'prod-2',
            tenant_id: 'tenant-1',
            category_id: null,
            name: 'Refrigerante',
            sku: null,
            unit: 'un',
            cost_price: 5,
            min_stock: 6,
            active: false,
            created_at: '2026-03-21T00:00:00.000Z',
            updated_at: '2026-03-21T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
    })
    useCreateProductMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUpdateProductMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useStockBalanceMock.mockReturnValue({
      data: [
        {
          product_id: 'prod-1',
          product_name: 'Farinha',
          category_name: 'Secos',
          current_stock: 2,
          min_stock: 5,
          unit: 'kg',
          is_low_stock: true,
        },
        {
          product_id: 'prod-2',
          product_name: 'Tomate',
          category_name: 'Hortifruti',
          current_stock: 10,
          min_stock: 3,
          unit: 'kg',
          is_low_stock: false,
        },
      ],
      isLoading: false,
    })
    useStockMovementsMock.mockReturnValue({
      data: {
        data: [
          {
            id: 'mov-1',
            created_at: '2026-03-21T10:00:00.000Z',
            product: { name: 'Farinha', unit: 'kg' },
            type: 'entry',
            quantity: 5,
            reason: 'Compra',
          },
        ],
      },
    })
    useCreateMovementMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useCloseDayMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useQueryMock.mockImplementation((options: { queryFn?: () => Promise<unknown> }) => ({
      data: [
        { id: 'extra-1', name: 'Borda de catupiry', price: 8, category: 'border', active: true },
        { id: 'extra-2', name: 'Cheddar', price: 4, category: 'other', active: true },
      ],
      isLoading: false,
      queryFn: options.queryFn,
    }))
    useDisconnectMercadoPagoAccountMock.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    })
    useNotificationSettingsMock.mockReturnValue({
      data: {
        whatsapp_order_received: true,
        whatsapp_order_confirmed: false,
        whatsapp_order_preparing: false,
        whatsapp_order_ready: false,
        whatsapp_order_out_for_delivery: false,
        whatsapp_order_delivered: false,
        whatsapp_order_cancelled: false,
      },
      isLoading: false,
    })
    useUpdateNotificationSettingsMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    useDeliverySettingsMock.mockReturnValue({
      data: { delivery_enabled: true, flat_fee: 8 },
      isLoading: false,
    })
    useUpdateDeliverySettingsMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    useDeliveryDriversMock.mockReturnValue({
      data: [],
      isLoading: false,
    })
    useCreateDeliveryDriverMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUpdateDeliveryDriverMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useDeleteDeliveryDriverMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUsersListMock.mockReturnValue({
      data: {
        users: [
          {
            id: 'user-1',
            full_name: 'Maria Silva',
            email: 'maria@test.com',
            role: 'owner',
            created_at: '2026-03-21T00:00:00.000Z',
          },
          {
            id: 'user-2',
            full_name: 'Carlos Souza',
            email: 'carlos@test.com',
            role: 'manager',
            created_at: '2026-03-21T00:00:00.000Z',
          },
        ],
        current_user_id: 'user-1',
        counts: {
          owner: 1,
          manager: 1,
          cashier: 0,
          kitchen: 0,
        },
        limits: {
          available_roles: ['manager', 'cashier', 'kitchen'],
          role_limits: {
            owner: 1,
            manager: 3,
            cashier: 5,
            kitchen: 4,
          },
        },
      },
      isLoading: false,
    })
    useCreateUserMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUpdateUserRoleMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useDeleteUserMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'owner',
        },
      },
    })
    useKDSOrdersMock.mockReturnValue({
      data: [],
      refetch: vi.fn(),
    })
    useMenuItemsMock.mockReturnValue({
      data: [
        {
          id: 'menu-1',
          tenant_id: 'tenant-1',
          category_id: 'cat-1',
          name: 'Pizza Margherita',
          description: 'Mussarela e manjericao',
          price: 32,
          available: true,
          display_order: 1,
          category: { id: 'cat-1', name: 'Pizzas' },
          extras: [{ extra: { id: 'extra-1', name: 'Borda', price: 5, category: 'border' } }],
        },
        {
          id: 'menu-2',
          tenant_id: 'tenant-1',
          category_id: 'cat-2',
          name: 'Lasanha',
          description: null,
          price: 28,
          available: false,
          display_order: 2,
          category: { id: 'cat-2', name: 'Massas' },
          extras: [],
        },
      ],
      isLoading: false,
    })
    useCreateMenuItemMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useOrdersMock.mockReturnValue({
      data: {
        count: 1,
        data: [
          {
            id: 'order-1',
            tenant_id: 'tenant-1',
            order_number: 12,
            customer_name: 'Cliente',
            customer_phone: '11999999999',
            customer_cpf: null,
            customer_id: null,
            table_number: null,
            status: 'ready',
            payment_method: 'delivery',
            payment_status: 'pending',
            delivery_status: 'waiting_dispatch',
            delivery_driver_id: null,
            subtotal: 42,
            delivery_fee: 8,
            total: 50,
            notes: 'Sem cebola',
            cancelled_reason: null,
            delivery_address: { street: 'Rua A', number: '10', city: 'Sao Paulo', state: 'SP' },
            created_at: '2026-03-21T12:00:00.000Z',
            updated_at: '2026-03-21T12:00:00.000Z',
            items: [
              {
                id: 'item-1',
                order_id: 'order-1',
                menu_item_id: 'menu-1',
                name: 'Burger',
                price: 42,
                quantity: 1,
                notes: null,
                extras: [{ id: 'extra-1', order_item_id: 'item-1', name: 'Bacon', price: 4 }],
              },
            ],
            notifications: [
              {
                id: 'not-1',
                channel: 'whatsapp',
                event_key: 'order_confirmed',
                status: 'sent',
                recipient: '11999999999',
                created_at: '2026-03-21T12:10:00.000Z',
              },
            ],
          },
        ],
      },
      isLoading: false,
    })
    useUpdateOrderStatusMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    useTablesMock.mockReturnValue({
      data: [
        {
          id: 'table-1',
          tenant_id: 'tenant-1',
          number: '10',
          capacity: 4,
          status: 'occupied',
          created_at: '2026-03-21T00:00:00.000Z',
          updated_at: '2026-03-21T00:00:00.000Z',
          active_session: {
            id: 'sess-1',
            tenant_id: 'tenant-1',
            table_id: 'table-1',
            opened_by: null,
            closed_by: null,
            status: 'open',
            customer_count: 2,
            total: 50,
            opened_at: '2026-03-21T12:00:00.000Z',
            closed_at: null,
            orders: [
              {
                id: 'order-1',
                order_number: 12,
                total: 50,
                items: [{ id: 'item-1', quantity: 1, name: 'Burger' }],
              },
            ],
          },
        },
      ],
      isLoading: false,
    })
    useCreateTableMock.mockReturnValue({ mutateAsync: vi.fn() })
    useUpdateTableMock.mockReturnValue({ mutateAsync: vi.fn() })
    useDeleteTableMock.mockReturnValue({ mutateAsync: vi.fn() })
    useOpenSessionMock.mockReturnValue({ mutateAsync: vi.fn() })
    useCloseSessionMock.mockReturnValue({ mutateAsync: vi.fn() })
    useTabsMock.mockImplementation((status: 'open' | 'closed') => ({
      data: status === 'open'
        ? [{
            id: 'tab-1',
            tenant_id: 'tenant-1',
            label: 'C-12',
            notes: 'Cliente VIP',
            status: 'open',
            total: 20,
            created_at: '2026-03-21T12:00:00.000Z',
            closed_at: null,
            orders: [{ id: 'order-1', status: 'confirmed', payment_status: 'pending', total: 30 }],
          }]
        : [{
            id: 'tab-2',
            tenant_id: 'tenant-1',
            label: 'C-10',
            notes: null,
            status: 'closed',
            total: 50,
            created_at: '2026-03-21T10:00:00.000Z',
            closed_at: '2026-03-21T11:00:00.000Z',
            orders: [],
          }],
      isLoading: false,
    }))
    useCreateTabMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })
    useCloseTabMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() })

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
              order_number: 12,
              customer_name: 'Cliente',
              status: 'pending',
              payment_status: 'pending',
              payment_method: 'delivery',
              total: 55,
              delivery_fee: 8,
              delivery_status: 'waiting_dispatch',
              delivery_driver_id: null,
              created_at: '2026-03-21T12:00:00.000Z',
            },
            {
              id: 'order-2',
              order_number: 13,
              customer_name: 'Cliente 2',
              status: 'delivered',
              payment_status: 'paid',
              payment_method: 'delivery',
              total: 92,
              delivery_fee: 10,
              delivery_status: 'delivered',
              delivery_driver_id: 'driver-1',
              created_at: '2026-03-21T10:00:00.000Z',
            },
          ])
        }

        if (table === 'delivery_drivers') {
          return queryBuilder({ name: 'Carlos' })
        }

        return queryBuilder(null)
      }),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(() => 'channel'),
      })),
      removeChannel: vi.fn(),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn(() =>
        queryBuilder([
          {
            tenant_id: 'tenant-1',
            product_name: 'Molho',
            current_stock: 1,
            min_stock: 2,
            unit: 'kg',
            active: true,
          },
        ]),
      ),
    })

    hasPlanFeatureMock.mockReturnValue(true)
  })

  it('renderiza app root, layouts e providers', async () => {
    const { default: Home } = await import('@/app/page')
    const { default: RootLayout } = await import('@/app/layout')
    const { default: AuthLayout } = await import('@/app/(auth)/layout')
    const { default: Providers } = await import('@/lib/providers')

    expect(renderToStaticMarkup(React.createElement(Home))).toContain(
      'Organize a operação do seu restaurante para vender mais, atender melhor e crescer com controle.'
    )
    expect(
      renderToStaticMarkup(
        React.createElement(RootLayout, null, React.createElement('div', null, 'conteudo')),
      ),
    ).toContain('conteudo')
    expect(
      renderToStaticMarkup(
        React.createElement(AuthLayout, null, React.createElement('div', null, 'autenticacao')),
      ),
    ).toContain('ChefOps')
    expect(
      renderToStaticMarkup(
        React.createElement(Providers, null, React.createElement('span', null, 'provider-child')),
      ),
    ).toContain('provider-child')
  })

  it('renderiza telas de autenticacao', async () => {
    const { default: LoginPage } = await import('@/app/(auth)/login/page')
    const { default: RegisterPage } = await import('@/app/(auth)/register/page')

    expect(renderToStaticMarkup(React.createElement(LoginPage))).toContain('Acesse o painel do seu estabelecimento')
    const registerMarkup = renderToStaticMarkup(React.createElement(RegisterPage))
    expect(registerMarkup).toContain('Cadastre seu estabelecimento no ChefOps')
    expect(registerMarkup).toContain('Identificador único')
  })

  it('renderiza dashboard page com resumo da operacao', async () => {
    const { default: DashboardPage } = await import('@/app/(dashboard)/dashboard/page')

    const element = await DashboardPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Maria')
    expect(markup).toContain('ChefOps House')
    expect(markup).toContain('Onboarding Wizard')
    expect(markup).toContain('Pedidos hoje')
    expect(markup).toContain('Molho')
  })

  it('renderiza estruturas de navegacao autenticada', async () => {
    const { default: DashboardLayout } = await import('@/app/(dashboard)/layout')
    const { default: AdminLayout } = await import('@/app/admin/layout')
    const { default: Sidebar } = await import('@/features/auth/components/Sidebar')
    const { default: DashboardAccessGuard } = await import('@/features/auth/components/DashboardAccessGuard')
    const { default: SuspendedPage } = await import('@/app/suspended/page')

    createClientMock
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn(async () => ({
            data: { user: { id: 'user-1' } },
          })),
        },
        from: vi.fn(() =>
          queryBuilder({
            full_name: 'Maria Silva',
            role: 'owner',
            tenants: { name: 'ChefOps House', slug: 'chefops-house' },
          }),
        ),
      })
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn(async () => ({
            data: { user: { id: 'admin-1' } },
          })),
        },
        from: vi.fn(() =>
          queryBuilder({
            full_name: 'Admin Master',
            is_admin: true,
          }),
        ),
      })

    const dashboardLayoutMarkup = renderToStaticMarkup(
      await DashboardLayout({
        children: React.createElement('div', null, 'dashboard-child'),
      }),
    )
    expect(dashboardLayoutMarkup).toContain('dashboard-child')

    const adminLayoutMarkup = renderToStaticMarkup(
      await AdminLayout({
        children: React.createElement('div', null, 'admin-child'),
      }),
    )
    expect(adminLayoutMarkup).toContain('Painel Admin')
    expect(adminLayoutMarkup).toContain('admin-child')

    const sidebarMarkup = renderToStaticMarkup(
      React.createElement(Sidebar, {
        profile: {
          full_name: 'Maria Silva',
          role: 'owner',
          tenants: { name: 'ChefOps House', slug: 'chefops-house' },
        },
      }),
    )
    expect(sidebarMarkup).toContain('ChefOps House')
    expect(sidebarMarkup).toContain('Integrações')

    useUserMock.mockReturnValueOnce({ user: null, loading: true })
    expect(renderToStaticMarkup(React.createElement(DashboardAccessGuard, null, 'guard-child'))).toContain('Carregando permissões')

    usePathnameMock.mockReturnValueOnce('/usuarios')
    useUserMock.mockReturnValueOnce({
      user: {
        profile: {
          role: 'cashier',
        },
      },
      loading: false,
    })
    expect(renderToStaticMarkup(React.createElement(DashboardAccessGuard, null, 'guard-child'))).toContain('Redirecionando')

    useUserMock.mockReturnValueOnce({
      user: {
        profile: {
          role: 'owner',
        },
      },
      loading: false,
    })
    expect(renderToStaticMarkup(React.createElement(DashboardAccessGuard, null, 'guard-child'))).toContain('guard-child')

    expect(renderToStaticMarkup(React.createElement(SuspendedPage))).toContain('Conta suspensa')
  })


  it('redireciona dashboard layout sem usuario e aceita tenants em array', async () => {
    const { default: DashboardLayout } = await import('@/app/(dashboard)/layout')

    createClientMock
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn(async () => ({
            data: { user: null },
          })),
        },
      })
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn(async () => ({
            data: { user: { id: 'user-2' } },
          })),
        },
        from: vi.fn(() =>
          queryBuilder({
            full_name: 'João',
            role: 'manager',
            tenants: [{ name: 'ChefOps 2', slug: 'chefops-2' }],
          }),
        ),
      })

    await expect(DashboardLayout({
      children: React.createElement('div', null, 'dashboard-child'),
    })).rejects.toThrow('redirect:/login')

    const markup = renderToStaticMarkup(
      await DashboardLayout({
        children: React.createElement('div', null, 'dashboard-array-child'),
      }),
    )

    expect(markup).toContain('dashboard-array-child')
  })

  it('redireciona layout admin sem usuario ou sem permissao', async () => {
    const { default: AdminLayout } = await import('@/app/admin/layout')

    createClientMock
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn(async () => ({
            data: { user: null },
          })),
        },
      })
      .mockReturnValueOnce({
        auth: {
          getUser: vi.fn(async () => ({
            data: { user: { id: 'user-1' } },
          })),
        },
        from: vi.fn(() =>
          queryBuilder({
            full_name: 'Maria Silva',
            is_admin: false,
          }),
        ),
      })

    await expect(AdminLayout({
      children: React.createElement('div', null, 'admin-child'),
    })).rejects.toThrow('redirect:/login')

    await expect(AdminLayout({
      children: React.createElement('div', null, 'admin-child'),
    })).rejects.toThrow('redirect:/dashboard')
  })

  it('renderiza paginas de dashboard cliente', async () => {
    const { default: CategoriasPage } = await import('@/app/(dashboard)/categorias/page')
    const { default: CardapioPage } = await import('@/app/(dashboard)/cardapio/page')
    const { default: ComandasPage } = await import('@/app/(dashboard)/comandas/page')
    const { default: ExtrasPage } = await import('@/app/(dashboard)/extras/page')
    const { default: EstoquePage } = await import('@/app/(dashboard)/estoque/page')
    const { default: MesasPage } = await import('@/app/(dashboard)/mesas/page')
    const { default: PedidosPage } = await import('@/app/(dashboard)/pedidos/page')
    const { default: ProdutosPage } = await import('@/app/(dashboard)/produtos/page')
    const { default: UsuariosPage } = await import('@/app/(dashboard)/usuarios/page')
    const { default: VendasPage } = await import('@/app/(dashboard)/vendas/page')
    const { default: PlanosPage } = await import('@/app/(dashboard)/planos/page')
    const { default: IntegracoesPage } = await import('@/app/(dashboard)/integracoes/page')
    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')
    const { default: KDSPage } = await import('@/app/(dashboard)/kds/page')
    const { default: InstallBanner } = await import('@/features/pwa/components/InstallBanner')

    expect(renderToStaticMarkup(React.createElement(CategoriasPage))).toContain('Categorias')
    expect(renderToStaticMarkup(React.createElement(CardapioPage))).toContain('Cardápio')
    expect(renderToStaticMarkup(React.createElement(ComandasPage))).toContain('Comandas')
    expect(renderToStaticMarkup(React.createElement(ExtrasPage))).toContain('Adicionais')
    expect(renderToStaticMarkup(React.createElement(EstoquePage))).toContain('Estoque')
    expect(renderToStaticMarkup(React.createElement(MesasPage))).toContain('Mesas')
    expect(renderToStaticMarkup(React.createElement(PedidosPage))).toContain('Pedidos')
    expect(renderToStaticMarkup(React.createElement(ProdutosPage))).toContain('Produtos')
    expect(renderToStaticMarkup(React.createElement(UsuariosPage))).toContain('Equipe e acessos')
    expect(renderToStaticMarkup(React.createElement(VendasPage))).toContain('Faturamento')
    expect(renderToStaticMarkup(React.createElement(PlanosPage))).toContain('Seu plano atual')
    expect(renderToStaticMarkup(React.createElement(IntegracoesPage))).toContain('Conectar Mercado Pago')
    expect(renderToStaticMarkup(React.createElement(EntregadoresPage))).toContain('Nenhum entregador cadastrado')
    expect(renderToStaticMarkup(React.createElement(KDSPage))).toContain('Nenhum pedido no momento')
    expect(renderToStaticMarkup(React.createElement(InstallBanner))).toBe('')
  }, 15000)

  it('renderiza estados alternativos das paginas cliente', async () => {
    useMercadoPagoAccountMock.mockReturnValueOnce({
      data: {
        mercado_pago_user_id: 'seller-1',
        live_mode: false,
        token_expires_at: '2026-04-01T12:00:00.000Z',
      },
      isLoading: false,
    })
    useHasFeatureMock.mockReturnValueOnce(false)
    useDeliveryDriversMock.mockReturnValueOnce({
      data: [
        {
          id: 'driver-1',
          name: 'Carlos',
          phone: '11999999999',
          vehicle_type: 'moto',
          notes: 'Turno da tarde',
          active: true,
        },
      ],
      isLoading: false,
    })
    useKDSOrdersMock.mockReturnValueOnce({
      data: [
        {
          id: 'order-1',
          order_number: 101,
          status: 'confirmed',
          created_at: '2026-03-21T12:00:00.000Z',
          table_number: 4,
          notes: 'Sem cebola',
          items: [
            {
              id: 'item-1',
              quantity: 2,
              name: 'Hamburguer',
              notes: 'Ponto da carne',
              extras: [{ id: 'extra-1', name: 'Bacon' }],
            },
          ],
        },
      ],
      refetch: vi.fn(),
    })
    useUserMock.mockReturnValueOnce({
      user: {
        profile: {
          role: 'attendant',
        },
      },
    })

    const { default: IntegracoesPage } = await import('@/app/(dashboard)/integracoes/page')
    const { default: EntregadoresPage } = await import('@/app/(dashboard)/entregadores/page')
    const { default: KDSPage } = await import('@/app/(dashboard)/kds/page')

    const integracoesMarkup = renderToStaticMarkup(React.createElement(IntegracoesPage))
    expect(integracoesMarkup).toContain('Desconectar')
    expect(integracoesMarkup).toContain('Recurso disponível apenas nos planos Standard e Premium')

    const entregadoresMarkup = renderToStaticMarkup(React.createElement(EntregadoresPage))
    expect(entregadoresMarkup).toContain('apenas owner e manager podem cadastrar ou editar')
    expect(entregadoresMarkup).toContain('Carlos')

    const kdsMarkup = renderToStaticMarkup(React.createElement(KDSPage))
    expect(kdsMarkup).toContain('Hamburguer')
    expect(kdsMarkup).toContain('Iniciar preparo')
  })
})
