import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const createClientMock = vi.fn()
const createAdminClientMock = vi.fn()
const notFoundMock = vi.fn()
const redirectMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    notFound: () => notFoundMock(),
    redirect: (...args: Parameters<typeof redirectMock>) => redirectMock(...args),
  }
})

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    asChild ? React.createElement(React.Fragment, null, children) : React.createElement('button', props, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', props, children),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  DialogContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('section', props, children),
  DialogHeader: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('header', props, children),
  DialogTitle: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('h2', props, children),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', props, children),
  SelectContent: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectItem: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('option', props, children),
  SelectTrigger: ({ children }: React.PropsWithChildren) => React.createElement('div', null, children),
  SelectValue: (props: Record<string, unknown>) => React.createElement('span', props),
}))

vi.mock('lucide-react', () => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => React.createElement('svg', props)
  return {
    AlertTriangle: Icon,
    ArrowUpRight: Icon,
    Building2: Icon,
    CalendarClock: Icon,
    CheckCircle2: Icon,
    CreditCard: Icon,
    Store: Icon,
    TrendingUp: Icon,
    Wallet: Icon,
    ArrowLeft: Icon,
    History: Icon,
    Search: Icon,
    ChevronDownIcon: Icon,
    XIcon: Icon,
  }
})

function flattenElements(node: React.ReactNode): React.ReactElement[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenElements(child))
  }

  if (!React.isValidElement(node)) {
    return []
  }

  if (typeof node.type === 'function') {
    return flattenElements(node.type(node.props))
  }

  return [node, ...flattenElements(node.props.children)]
}

function getTextContent(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map((child) => getTextContent(child)).join('')
  if (!React.isValidElement(node)) return ''
  return getTextContent(node.props.children)
}

function queryBuilder(data: unknown) {
  return {
    select: vi.fn(() => queryBuilder(data)),
    eq: vi.fn(() => queryBuilder(data)),
    order: vi.fn(() => queryBuilder(data)),
    limit: vi.fn(async () => ({ data })),
    maybeSingle: vi.fn(async () => ({ data })),
    single: vi.fn(async () => ({ data })),
  }
}

describe('admin pages smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    notFoundMock.mockImplementation(() => {
      throw new Error('not-found')
    })
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`)
    })

    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'admin-1' } } })),
      },
      from: vi.fn(() => queryBuilder({ is_admin: true })),
    })

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-1',
              name: 'ChefOps House',
              slug: 'chefops-house',
              plan: 'free',
              status: 'active',
              created_at: '2026-03-01T00:00:00.000Z',
              next_billing_at: '2026-03-24T00:00:00.000Z',
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-1',
              total: 100,
              created_at: '2026-03-20T00:00:00.000Z',
              payment_status: 'paid',
              status: 'confirmed',
            },
          ])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([
            {
              tenant_id: 'tenant-1',
              provider: 'mercado_pago',
              status: 'connected',
              live_mode: true,
              mercado_pago_user_id: 'seller-1',
              connected_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-10T00:00:00.000Z',
              token_expires_at: '2026-04-01T00:00:00.000Z',
            },
          ])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-1',
              name: 'ChefOps House',
              slug: 'chefops-house',
              plan: 'free',
              status: 'active',
              total_users: 2,
              total_orders: 20,
              total_revenue: 700,
              next_billing_at: '2026-03-24T00:00:00.000Z',
              last_order_at: '2026-03-20T00:00:00.000Z',
              created_at: '2026-03-01T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([
            {
              tenant_id: 'tenant-1',
              plan: 'basic',
              status: 'authorized',
              next_payment_date: '2026-03-24T00:00:00.000Z',
              cancel_at_period_end: false,
              scheduled_plan: null,
              created_at: '2026-03-01T00:00:00.000Z',
            },
          ])
        }
        if (table === 'checkout_sessions') {
          return queryBuilder([
            {
              id: 'chk-1',
              status: 'converted',
              amount: 100,
              mercado_pago_payment_id: 'pay-1',
              created_order_id: 'order-1',
              created_at: '2026-03-20T00:00:00.000Z',
            },
          ])
        }
        if (table === 'admin_tenant_events') {
          return queryBuilder([
            {
              id: 'event-1',
              message: 'Plano alterado',
              created_at: '2026-03-20T12:00:00.000Z',
            },
          ])
        }

        return queryBuilder(null)
      }),
    })
  })

  it('renderiza dashboard admin, listagem de tenants e detalhe do tenant', async () => {
    const { default: AdminPage } = await import('@/app/admin/page')
    const { default: AdminTenantsPage } = await import('@/app/admin/tenants/page')
    const { default: AdminTenantDetailsPage } = await import('@/app/admin/tenants/[id]/page')

    expect(renderToStaticMarkup(await AdminPage())).toContain('Visão geral')
    expect(renderToStaticMarkup(React.createElement(AdminTenantsPage))).toContain('Estabelecimentos')
    expect(renderToStaticMarkup(
      await AdminTenantDetailsPage({
        params: Promise.resolve({ id: 'tenant-1' }),
      }),
    )).toContain('Saúde operacional')
  }, 10000)

  it('renderiza listas auxiliares do detalhe admin', async () => {
    const { TenantCheckoutList, TenantHistoryList } = await import('@/app/admin/tenants/[id]/TenantDetailLists')

    expect(renderToStaticMarkup(
      React.createElement(TenantCheckoutList, {
        checkoutSessions: [{ id: 'chk-1', status: 'converted', amount: 100, mercado_pago_payment_id: 'pay-1', created_order_id: 'order-1', created_at: '2026-03-20T00:00:00.000Z' }],
      }),
    )).toContain('Últimas sessões de checkout')

    expect(renderToStaticMarkup(
      React.createElement(TenantHistoryList, {
        events: [{ id: 'event-1', message: 'Plano alterado', created_at: '2026-03-20T12:00:00.000Z' }],
      }),
    )).toContain('Histórico administrativo')
  })

  it('renderiza tabela admin de tenants com vazio e potencial de upgrade', async () => {
    const { AdminTenantsTable } = await import('@/features/admin/AdminTenantsTable')

    const emptyMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantsTable, {
        loading: false,
        filtered: [],
        paginated: [],
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        onManage: vi.fn(),
      }),
    )

    const tableMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantsTable, {
        loading: false,
        filtered: [
          {
            id: 'tenant-1',
            name: 'ChefOps House',
            slug: 'chefops-house',
            plan: 'free',
            status: 'active',
            created_at: '2026-03-01T00:00:00.000Z',
            suspended_at: null,
            suspension_reason: null,
            next_billing_at: '2026-03-24T00:00:00.000Z',
            total_users: 2,
            total_orders: 20,
            total_revenue: 700,
            last_order_at: '2026-03-20T00:00:00.000Z',
          },
        ],
        paginated: [
          {
            id: 'tenant-1',
            name: 'ChefOps House',
            slug: 'chefops-house',
            plan: 'free',
            status: 'active',
            created_at: '2026-03-01T00:00:00.000Z',
            suspended_at: null,
            suspension_reason: null,
            next_billing_at: '2026-03-24T00:00:00.000Z',
            total_users: 2,
            total_orders: 20,
            total_revenue: 700,
            last_order_at: '2026-03-20T00:00:00.000Z',
          },
        ],
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        onManage: vi.fn(),
      }),
    )

    expect(emptyMarkup).toContain('Nenhum estabelecimento encontrado.')
    expect(tableMarkup).toContain('ChefOps House')
    expect(tableMarkup).toContain('Potencial de upgrade')
    expect(tableMarkup).toContain('Detalhes')
    expect(tableMarkup).toContain('Gerenciar')
  })

  it('renderiza modal de gerenciamento admin para tenant ativo e suspenso', async () => {
    const { AdminTenantManagementDialog } = await import('@/features/admin/AdminTenantManagementDialog')

    const activeMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantManagementDialog, {
        selected: {
          id: 'tenant-1',
          name: 'ChefOps House',
          slug: 'chefops-house',
          plan: 'basic',
          status: 'active',
          created_at: '2026-03-01T00:00:00.000Z',
          suspended_at: null,
          suspension_reason: null,
          next_billing_at: '2026-03-24T00:00:00.000Z',
          total_users: 4,
          total_orders: 30,
          total_revenue: 900,
          last_order_at: '2026-03-20T00:00:00.000Z',
        },
        newPlan: 'basic',
        newBillingDate: '2026-03-24',
        suspendReason: 'Inadimplência',
        saving: false,
        onOpenChange: vi.fn(),
        onPlanChange: vi.fn(),
        onBillingDateChange: vi.fn(),
        onSuspendReasonChange: vi.fn(),
        onSave: vi.fn(),
        onSuspend: vi.fn(),
        onReactivate: vi.fn(),
      }),
    )

    const suspendedMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantManagementDialog, {
        selected: {
          id: 'tenant-2',
          name: 'Pizza Prime',
          slug: 'pizza-prime',
          plan: 'pro',
          status: 'suspended',
          created_at: '2026-03-01T00:00:00.000Z',
          suspended_at: '2026-03-10T00:00:00.000Z',
          suspension_reason: 'Chargeback',
          next_billing_at: null,
          total_users: 8,
          total_orders: 80,
          total_revenue: 5000,
          last_order_at: '2026-03-18T00:00:00.000Z',
        },
        newPlan: 'pro',
        newBillingDate: '',
        suspendReason: '',
        saving: true,
        onOpenChange: vi.fn(),
        onPlanChange: vi.fn(),
        onBillingDateChange: vi.fn(),
        onSuspendReasonChange: vi.fn(),
        onSave: vi.fn(),
        onSuspend: vi.fn(),
        onReactivate: vi.fn(),
      }),
    )

    expect(activeMarkup).toContain('Motivo da suspensão')
    expect(activeMarkup).toContain('Salvar alterações')
    expect(activeMarkup).toContain('Suspender')
    expect(suspendedMarkup).toContain('Motivo da suspensão')
    expect(suspendedMarkup).toContain('Chargeback')
    expect(suspendedMarkup).toContain('Reativar')
    expect(suspendedMarkup).toContain('Salvando...')
  })

  it('renderiza cards e filtros de tenants admin', async () => {
    const { AdminTenantsStats } = await import('@/features/admin/AdminTenantsStats')
    const { AdminTenantsFilters } = await import('@/features/admin/AdminTenantsFilters')

    const statsMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantsStats, {
        cards: [
          { title: 'Base total', value: '10', description: '8 ativos', tone: 'sky' },
          { title: 'Suspensos', value: '2', description: 'Clientes com ação pendente', tone: 'red' },
          { title: 'Prontos para upgrade', value: '3', description: 'Basic com uso acima da média', tone: 'amber' },
          { title: 'MRR estimado', value: 'R$ 1.000,00', description: 'Baseado em Standard e Premium', tone: 'violet' },
        ],
      }),
    )

    const filtersMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantsFilters, {
        search: 'chef',
        planFilter: 'basic',
        statusFilter: 'active',
        filterSummary: {
          filteredCount: 4,
          freeCount: 2,
          paidCount: 8,
        },
        onSearchChange: vi.fn(),
        onPlanFilterChange: vi.fn(),
        onStatusFilterChange: vi.fn(),
      }),
    )

    expect(statsMarkup).toContain('Base total')
    expect(statsMarkup).toContain('Prontos para upgrade')
    expect(statsMarkup).toContain('R$ 1.000,00')
    expect(filtersMarkup).toContain('4 encontrados')
    expect(filtersMarkup).toContain('2 no Basic')
    expect(filtersMarkup).toContain('8 pagantes')
  })

  it('aciona ações da tabela e do modal admin', async () => {
    const { AdminTenantsTable } = await import('@/features/admin/AdminTenantsTable')
    const { AdminTenantManagementDialog } = await import('@/features/admin/AdminTenantManagementDialog')

    const tenant = {
      id: 'tenant-1',
      name: 'ChefOps House',
      slug: 'chefops-house',
      plan: 'free',
      status: 'active',
      created_at: '2026-03-01T00:00:00.000Z',
      suspended_at: null,
      suspension_reason: null,
      next_billing_at: '2026-03-24T00:00:00.000Z',
      total_users: 2,
      total_orders: 20,
      total_revenue: 700,
      last_order_at: '2026-03-20T00:00:00.000Z',
    } as const

    const onManage = vi.fn()
    const onPageChange = vi.fn()
    const tableTree = AdminTenantsTable({
      loading: false,
      filtered: [tenant],
      paginated: [tenant],
      page: 2,
      totalPages: 3,
      onPageChange,
      onManage,
    })

    const tableButtons = flattenElements(tableTree).filter((element) => element.type === 'button')
    tableButtons.find((button) => getTextContent(button).includes('Gerenciar'))?.props.onClick()
    tableButtons.find((button) => getTextContent(button).includes('Anterior'))?.props.onClick()
    tableButtons.find((button) => getTextContent(button).includes('Próxima'))?.props.onClick()

    expect(onManage).toHaveBeenCalledWith(expect.objectContaining({ id: 'tenant-1' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
    expect(onPageChange).toHaveBeenCalledWith(3)

    const onOpenChange = vi.fn()
    const onPlanChange = vi.fn()
    const onBillingDateChange = vi.fn()
    const onSuspendReasonChange = vi.fn()
    const onSave = vi.fn()
    const onSuspend = vi.fn()

    const dialogTree = AdminTenantManagementDialog({
      selected: tenant,
      newPlan: 'free',
      newBillingDate: '2026-03-24',
      suspendReason: 'Inadimplência',
      saving: false,
      onOpenChange,
      onPlanChange,
      onBillingDateChange,
      onSuspendReasonChange,
      onSave,
      onSuspend,
      onReactivate: vi.fn(),
    })

    const dialogElements = flattenElements(dialogTree)
    const dialogButtons = dialogElements.filter((element) => element.type === 'button')
    const dialogInputs = dialogElements.filter((element) => element.type === 'input')

    dialogInputs.find((input) => input.props.type === 'date')?.props.onChange({ target: { value: '2026-04-01' } })
    dialogInputs.find((input) => input.props.placeholder?.includes('Inadimplência'))?.props.onChange({
      target: { value: 'Fatura vencida' },
    })
    dialogButtons.find((button) => getTextContent(button).includes('Salvar alterações'))?.props.onClick()
    dialogButtons.find((button) => getTextContent(button).includes('Suspender'))?.props.onClick()

    expect(onBillingDateChange).toHaveBeenCalledWith('2026-04-01')
    expect(onSuspendReasonChange).toHaveBeenCalledWith('Fatura vencida')
    expect(onSave).toHaveBeenCalled()
    expect(onSuspend).toHaveBeenCalled()
  })

  it('aciona handlers dos filtros admin', async () => {
    const { AdminTenantsFilters } = await import('@/features/admin/AdminTenantsFilters')

    const onSearchChange = vi.fn()
    const onPlanFilterChange = vi.fn()
    const onStatusFilterChange = vi.fn()

    const tree = AdminTenantsFilters({
      search: '',
      planFilter: 'all',
      statusFilter: 'all',
      filterSummary: {
        filteredCount: 1,
        freeCount: 1,
        paidCount: 0,
      },
      onSearchChange,
      onPlanFilterChange,
      onStatusFilterChange,
    })

    const elements = flattenElements(tree)
    const searchInput = elements.find((element) => element.type === 'input')
    const selectRoots = elements.filter((element) => typeof element.props.onValueChange === 'function')

    searchInput?.props.onChange({ target: { value: 'pizza-prime' } })
    selectRoots[0]?.props.onValueChange('pro')
    selectRoots[1]?.props.onValueChange('suspended')

    expect(onSearchChange).toHaveBeenCalledWith('pizza-prime')
    expect(onPlanFilterChange).toHaveBeenCalledWith('pro')
    expect(onStatusFilterChange).toHaveBeenCalledWith('suspended')
  })

  it('renderiza página admin de tenants em estado carregado com modal aberto', async () => {
    vi.resetModules()
    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      let stateCall = 0
      const selectedTenant = {
        id: 'tenant-2',
        name: 'Pizza Prime',
        slug: 'pizza-prime',
        plan: 'pro',
        status: 'suspended',
        created_at: '2026-03-01T00:00:00.000Z',
        suspended_at: '2026-03-10T00:00:00.000Z',
        suspension_reason: 'Chargeback',
        next_billing_at: null,
        total_users: 8,
        total_orders: 80,
        total_revenue: 5000,
        last_order_at: '2026-03-18T00:00:00.000Z',
      }

      return {
        ...actualReact,
        useEffect: vi.fn(),
        useState: (initialValue: unknown) => {
          stateCall += 1

          const valuesByCall = new Map<number, unknown>([
            [1, [
              {
                id: 'tenant-1',
                name: 'ChefOps House',
                slug: 'chefops-house',
                plan: 'free',
                status: 'active',
                created_at: '2026-03-01T00:00:00.000Z',
                suspended_at: null,
                suspension_reason: null,
                next_billing_at: '2026-03-24T00:00:00.000Z',
                total_users: 2,
                total_orders: 20,
                total_revenue: 700,
                last_order_at: '2026-03-20T00:00:00.000Z',
              },
              selectedTenant,
            ]],
            [2, false],
            [3, 'pizza'],
            [4, 'pro'],
            [5, 'suspended'],
            [6, selectedTenant],
            [7, 'Chargeback'],
            [8, 'pro'],
            [9, '2026-04-01'],
            [10, false],
            [11, 1],
          ])

          return [valuesByCall.get(stateCall) ?? initialValue, vi.fn()]
        },
      }
    })

    const { default: AdminTenantsPage } = await import('@/app/admin/tenants/page')
    const markup = renderToStaticMarkup(React.createElement(AdminTenantsPage))

    expect(markup).toContain('Estabelecimentos')
    expect(markup).toContain('Operação comercial')
    expect(markup).toContain('1 encontrados')
    expect(markup).toContain('1 no Basic')
    expect(markup).toContain('1 pagantes')
    expect(markup).toContain('Pizza Prime')
    expect(markup).toContain('Motivo da suspensão')
    expect(markup).toContain('Chargeback')
    expect(markup).toContain('Reativar')

    vi.doUnmock('react')
    vi.resetModules()
  })
})
