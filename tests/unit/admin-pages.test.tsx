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
  const result = { data }
  return {
    select: vi.fn(() => queryBuilder(data)),
    eq: vi.fn(() => queryBuilder(data)),
    order: vi.fn(() => queryBuilder(data)),
    limit: vi.fn(async () => ({ data })),
    maybeSingle: vi.fn(async () => ({ data })),
    single: vi.fn(async () => ({ data })),
    then: (onFulfilled: (value: typeof result) => unknown) => Promise.resolve(onFulfilled(result)),
    catch: () => Promise.resolve(result),
    finally: () => Promise.resolve(result),
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

  it('renderiza fallbacks da visão geral admin sem billing central configurado', async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL

    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-2',
              name: 'Pizza Prime',
              slug: 'pizza-prime',
              plan: 'basic',
              status: 'inactive',
              created_at: '2026-01-10T00:00:00.000Z',
              next_billing_at: null,
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-2',
              name: 'Pizza Prime',
              slug: 'pizza-prime',
              plan: 'basic',
              status: 'inactive',
              total_users: 1,
              total_orders: 0,
              total_revenue: 0,
              next_billing_at: null,
              last_order_at: null,
              created_at: '2026-01-10T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminPage } = await import('@/app/admin/page')
    const markup = renderToStaticMarkup(await AdminPage())

    expect(markup).toContain('Requer configuração')
    expect(markup).toContain('Não configurado')
    expect(markup).toContain('URL não configurada')
    expect(markup).toContain('Token central')
    expect(markup).toContain('Pendente')
    expect(markup).toContain('Sem Mercado Pago conectado')

    if (previousAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
    }
  })

  it('renderiza visão geral admin saudável com billing central pronto em desenvolvimento', async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const previousAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const previousWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-central'
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'whsec-central'

    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-healthy',
              name: 'Cafe Central',
              slug: 'cafe-central',
              plan: 'pro',
              status: 'active',
              created_at: '2026-03-10T00:00:00.000Z',
              next_billing_at: '2026-03-28T00:00:00.000Z',
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([
            {
              total: 250,
              created_at: '2026-03-18T00:00:00.000Z',
              payment_status: 'paid',
            },
          ])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([
            {
              tenant_id: 'tenant-healthy',
              status: 'connected',
              live_mode: false,
            },
          ])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-healthy',
              name: 'Cafe Central',
              slug: 'cafe-central',
              plan: 'pro',
              status: 'active',
              total_users: 4,
              total_orders: 40,
              total_revenue: 1800,
              next_billing_at: '2026-03-28T00:00:00.000Z',
              last_order_at: '2026-03-19T00:00:00.000Z',
              created_at: '2026-03-10T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([
            {
              tenant_id: 'tenant-healthy',
              plan: 'pro',
              status: 'authorized',
              next_payment_date: '2026-03-28T00:00:00.000Z',
              cancel_at_period_end: false,
              scheduled_plan: null,
            },
          ])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminPage } = await import('@/app/admin/page')
    const markup = renderToStaticMarkup(await AdminPage())

    expect(markup).toContain('Pronta para cobrar')
    expect(markup).toContain('Desenvolvimento')
    expect(markup).toContain('localhost')
    expect(markup).toContain('Pronta para cobrar')
    expect(markup).toContain('OK')

    if (previousAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }

    if (previousAccessToken) {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = previousAccessToken
    } else {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    }

    if (previousWebhookSecret) {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = previousWebhookSecret
    } else {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    }
  })

  it('renderiza visão geral admin com URL inválida e fallback saudável', async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const previousAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const previousWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

    process.env.NEXT_PUBLIC_APP_URL = 'url-invalida'
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-central'
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'whsec-central'

    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-clean',
              name: 'Bistro Azul',
              slug: 'bistro-azul',
              plan: 'pro',
              status: 'active',
              created_at: '2026-03-15T00:00:00.000Z',
              next_billing_at: '2026-03-30T00:00:00.000Z',
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([
            {
              total: 90,
              created_at: '2026-03-18T00:00:00.000Z',
              payment_status: 'paid',
            },
          ])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([
            {
              tenant_id: 'tenant-clean',
              status: 'connected',
              live_mode: true,
            },
          ])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-clean',
              name: 'Bistro Azul',
              slug: 'bistro-azul',
              plan: 'pro',
              status: 'inactive',
              total_users: 2,
              total_orders: 8,
              total_revenue: 450,
              next_billing_at: '2026-03-30T00:00:00.000Z',
              last_order_at: '2026-03-18T00:00:00.000Z',
              created_at: '2026-03-15T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([
            {
              tenant_id: 'tenant-clean',
              plan: 'pro',
              status: 'authorized',
              next_payment_date: '2026-03-30T00:00:00.000Z',
              cancel_at_period_end: false,
              scheduled_plan: null,
            },
          ])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminPage } = await import('@/app/admin/page')
    const markup = renderToStaticMarkup(await AdminPage())

    expect(markup).toContain('Configuração inválida')
    expect(markup).toContain('url-invalida')
    expect(markup).toContain('Nenhum alerta importante no momento.')
    expect(markup).toContain('A base está saudável e sem pendências críticas.')
    expect(markup).toContain('Inativo')
    expect(markup).toContain('Pronta para cobrar')

    if (previousAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }

    if (previousAccessToken) {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = previousAccessToken
    } else {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    }

    if (previousWebhookSecret) {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = previousWebhookSecret
    } else {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    }
  })

  it('renderiza visão geral admin sem alertas e com assinaturas pendentes/programadas', async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const previousAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const previousWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.app'
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-central'
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'whsec-central'

    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-clear',
              name: 'Padaria Solar',
              slug: 'padaria-solar',
              plan: 'pro',
              status: 'active',
              created_at: '2026-03-10T00:00:00.000Z',
              next_billing_at: '2026-03-28T00:00:00.000Z',
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([
            {
              total: 180,
              created_at: '2026-03-19T00:00:00.000Z',
              payment_status: 'paid',
            },
          ])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([
            {
              tenant_id: 'tenant-clear',
              status: 'connected',
              live_mode: true,
            },
          ])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-clear',
              name: 'Padaria Solar',
              slug: 'padaria-solar',
              plan: 'pro',
              status: 'active',
              total_users: 3,
              total_orders: 14,
              total_revenue: 980,
              next_billing_at: '2026-03-28T00:00:00.000Z',
              last_order_at: '2026-03-19T00:00:00.000Z',
              created_at: '2026-03-10T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([
            {
              tenant_id: 'tenant-clear',
              plan: 'pro',
              status: 'pending',
              next_payment_date: '2026-03-28T00:00:00.000Z',
              cancel_at_period_end: true,
              scheduled_plan: 'basic',
              created_at: '2026-03-10T00:00:00.000Z',
            },
          ])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminPage } = await import('@/app/admin/page')
    const markup = renderToStaticMarkup(await AdminPage())

    expect(markup).toContain('Nenhum alerta importante no momento.')
    expect(markup).toContain('A base está saudável e sem pendências críticas.')
    expect(markup).toContain('Produção')
    expect(markup).toContain('chefops.app')
    expect(markup).toContain('Pendentes')
    expect(markup).toContain('Cancelam no próximo ciclo')
    expect(markup).toContain('Trocas programadas')
    expect(markup).toContain('Atrasadas</span><span class="font-semibold text-slate-900">0</span>')
    expect(markup).toContain('Sem conexão</span><span class="font-semibold text-slate-900">0</span>')

    if (previousAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }

    if (previousAccessToken) {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = previousAccessToken
    } else {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    }

    if (previousWebhookSecret) {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = previousWebhookSecret
    } else {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    }
  })

  it('renderiza visão geral admin com tenant suspenso, cobrança atrasada e sem conexão de pagamento', async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const previousAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const previousWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.app'
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-central'
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'whsec-central'

    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-suspended',
              name: 'Massas Nuvem',
              slug: 'massas-nuvem',
              plan: 'basic',
              status: 'suspended',
              created_at: '2026-02-01T00:00:00.000Z',
              next_billing_at: '2026-03-01T00:00:00.000Z',
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-suspended',
              name: 'Massas Nuvem',
              slug: 'massas-nuvem',
              plan: 'basic',
              status: 'suspended',
              total_users: 2,
              total_orders: 3,
              total_revenue: 120,
              next_billing_at: '2026-03-01T00:00:00.000Z',
              last_order_at: null,
              created_at: '2026-02-01T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminPage } = await import('@/app/admin/page')
    const markup = renderToStaticMarkup(await AdminPage())

    expect(markup).toContain('Sem Mercado Pago conectado')
    expect(markup).toContain('Cobrança atrasada')
    expect(markup).toContain('Suspenso')
    expect(markup).toContain('Massas Nuvem')
    expect(markup).toContain('Basic')

    if (previousAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }

    if (previousAccessToken) {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = previousAccessToken
    } else {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    }

    if (previousWebhookSecret) {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = previousWebhookSecret
    } else {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    }
  })

  it('renderiza contadores do overview admin com atraso e sem conexão em tenants ativos', async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const previousAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const previousWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.app'
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-central'
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'whsec-central'

    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-overdue',
              name: 'Lanches da Praça',
              slug: 'lanches-da-praca',
              plan: 'basic',
              status: 'active',
              created_at: '2026-02-01T00:00:00.000Z',
              next_billing_at: '2026-03-01T00:00:00.000Z',
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-overdue',
              name: 'Lanches da Praça',
              slug: 'lanches-da-praca',
              plan: 'basic',
              status: 'active',
              total_users: 1,
              total_orders: 1,
              total_revenue: 50,
              next_billing_at: '2026-03-01T00:00:00.000Z',
              last_order_at: null,
              created_at: '2026-02-01T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminPage } = await import('@/app/admin/page')
    const markup = renderToStaticMarkup(await AdminPage())

    expect(markup).toContain('Atrasadas</span><span class="font-semibold text-red-600">1</span>')
    expect(markup).toContain('Sem conexão</span><span class="font-semibold text-amber-600">1</span>')

    if (previousAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }

    if (previousAccessToken) {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = previousAccessToken
    } else {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    }

    if (previousWebhookSecret) {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = previousWebhookSecret
    } else {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    }
  })

  it('renderiza cliente recente com receita nula e cobrança ausente', async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const previousAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
    const previousWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

    process.env.NEXT_PUBLIC_APP_URL = 'https://chefops.app'
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'token-central'
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'whsec-central'

    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return queryBuilder([
            {
              id: 'tenant-null-revenue',
              name: 'Tempero da Vila',
              slug: 'tempero-da-vila',
              plan: 'basic',
              status: 'active',
              created_at: '2026-03-05T00:00:00.000Z',
              next_billing_at: null,
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([])
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder([
            {
              tenant_id: 'tenant-null-revenue',
              status: 'connected',
              live_mode: true,
            },
          ])
        }
        if (table === 'admin_tenants') {
          return queryBuilder([
            {
              id: 'tenant-null-revenue',
              name: 'Tempero da Vila',
              slug: 'tempero-da-vila',
              plan: 'basic',
              status: 'active',
              total_users: 1,
              total_orders: 0,
              total_revenue: null,
              next_billing_at: null,
              last_order_at: null,
              created_at: '2026-03-05T00:00:00.000Z',
            },
          ])
        }
        if (table === 'saas_billing_subscriptions') {
          return queryBuilder([])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminPage } = await import('@/app/admin/page')
    const markup = renderToStaticMarkup(await AdminPage())

    expect(markup).toContain('Tempero da Vila')
    expect(markup).toContain('Ativo')
    expect(markup).toContain('0,00')

    if (previousAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }

    if (previousAccessToken) {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = previousAccessToken
    } else {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    }

    if (previousWebhookSecret) {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = previousWebhookSecret
    } else {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    }
  })

  it('cobre helpers do overview admin com delta negativo, receita nula e upgrade por conexão', async () => {
    const { buildAdminOverview, formatDelta } = await import('@/features/admin/admin-page')

    expect(formatDelta(12, 10)).toBe('+20%')
    expect(formatDelta(5, 10)).toBe('-50%')
    expect(formatDelta(10, 10)).toBe('0%')

    const overview = buildAdminOverview({
      now: new Date('2026-03-23T12:00:00.000Z'),
      tenants: [
        {
          id: 'tenant-upgrade',
          name: 'Conecta Cafe',
          slug: 'conecta-cafe',
          plan: 'free',
          status: 'active',
          created_at: '2026-03-10T00:00:00.000Z',
          next_billing_at: null,
        },
      ],
      orders: [
        {
          total: null,
          created_at: '2026-03-22T00:00:00.000Z',
          payment_status: 'paid',
        },
        {
          total: 50,
          created_at: '2026-02-10T00:00:00.000Z',
          payment_status: 'paid',
        },
        {
          total: null,
          created_at: '2026-02-12T00:00:00.000Z',
          payment_status: 'paid',
        },
      ],
      accounts: [
        {
          tenant_id: 'tenant-upgrade',
          status: 'connected',
          live_mode: false,
        },
      ],
      adminTenants: [
        {
          id: 'tenant-upgrade',
          name: 'Conecta Cafe',
          slug: 'conecta-cafe',
          plan: 'free',
          status: 'active',
          total_users: 1,
          total_orders: 2,
          total_revenue: 100,
          next_billing_at: null,
          last_order_at: null,
        },
      ],
      saasSubscriptions: [],
      appUrl: 'https://chefops.app',
      hasCentralToken: true,
      hasWebhookSecret: true,
    })

    expect(overview.revenue30d).toBe(0)
    expect(overview.previousRevenue).toBe(50)
    expect(overview.upgradeCandidates).toHaveLength(1)
    expect(overview.upgradeCandidates[0]?.id).toBe('tenant-upgrade')
  })

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

  it('renderiza estados vazios e fallbacks das listas auxiliares do detalhe admin', async () => {
    const { TenantCheckoutList, TenantHistoryList } = await import('@/app/admin/tenants/[id]/TenantDetailLists')

    const emptyCheckoutMarkup = renderToStaticMarkup(
      React.createElement(TenantCheckoutList, {
        checkoutSessions: [],
      }),
    )

    const fallbackCheckoutMarkup = renderToStaticMarkup(
      React.createElement(TenantCheckoutList, {
        checkoutSessions: [
          {
            id: 'chk-2',
            status: 'pending',
            amount: 0,
            mercado_pago_payment_id: null,
            created_order_id: null,
            created_at: '2026-03-21T00:00:00.000Z',
          },
        ],
      }),
    )

    const emptyHistoryMarkup = renderToStaticMarkup(
      React.createElement(TenantHistoryList, {
        events: [],
      }),
    )

    expect(emptyCheckoutMarkup).toContain('Nenhuma sessão recente.')
    expect(fallbackCheckoutMarkup).toContain('Sem pedido')
    expect(fallbackCheckoutMarkup).toContain('Sem pagamento')
    expect(emptyHistoryMarkup).toContain('Nenhum evento administrativo registrado ainda.')
  })

  it('renderiza fallbacks de valor e data ausentes nas listas auxiliares do detalhe admin', async () => {
    const { TenantCheckoutList } = await import('@/app/admin/tenants/[id]/TenantDetailLists')

    const fallbackMarkup = renderToStaticMarkup(
      React.createElement(TenantCheckoutList, {
        checkoutSessions: [
          {
            id: 'chk-null',
            status: 'pending',
            amount: null as never,
            mercado_pago_payment_id: null,
            created_order_id: null,
            created_at: null as never,
          },
        ],
      }),
    )

    expect(fallbackMarkup).toContain('R$')
    expect(fallbackMarkup).toContain('0,00')
    expect(fallbackMarkup).toContain('· —')
    expect(fallbackMarkup).toContain('Sem pedido')
    expect(fallbackMarkup).toContain('Sem pagamento')
  })

  it('renderiza fallbacks do detalhe admin sem conta conectada', async () => {
    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'admin_tenants') {
          return queryBuilder({
            id: 'tenant-3',
            name: 'Casa do Burger',
            slug: 'casa-do-burger',
            plan: 'pro',
            status: 'inactive',
            created_at: '2026-01-15T00:00:00.000Z',
            suspended_at: null,
            suspension_reason: null,
            next_billing_at: null,
            total_users: 5,
            total_orders: 12,
            total_revenue: 340,
            last_order_at: null,
          })
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder(null)
        }
        if (table === 'checkout_sessions') {
          return queryBuilder([])
        }
        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-2',
              status: 'pending',
              payment_status: 'pending',
              total: 40,
              created_at: '2026-03-10T00:00:00.000Z',
            },
          ])
        }
        if (table === 'admin_tenant_events') {
          return queryBuilder([])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminTenantDetailsPage } = await import('@/app/admin/tenants/[id]/page')
    const markup = renderToStaticMarkup(
      await AdminTenantDetailsPage({
        params: Promise.resolve({ id: 'tenant-3' }),
      }),
    )

    expect(markup).toContain('Não conectado')
    expect(markup).toContain('Pagamento online indisponível')
    expect(markup).toContain('Sem observações administrativas')
    expect(markup).toContain('Último pedido em —')
    expect(markup).toContain('0 pagos · 0 reembolsados')
    expect(markup).toContain('1 pendentes')
    expect(markup).toContain('Não conectado')
  })

  it('renderiza detalhe admin para tenant suspenso com conta em teste', async () => {
    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'admin_tenants') {
          return queryBuilder({
            id: 'tenant-4',
            name: 'Sushi Lab',
            slug: 'sushi-lab',
            plan: 'basic',
            status: 'suspended',
            created_at: '2026-01-15T00:00:00.000Z',
            suspended_at: '2026-03-01T00:00:00.000Z',
            suspension_reason: 'Chargeback',
            next_billing_at: '2026-03-18T00:00:00.000Z',
            total_users: 6,
            total_orders: 18,
            total_revenue: 1200,
            last_order_at: '2026-03-12T00:00:00.000Z',
          })
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder({
            provider: 'mercado_pago',
            mercado_pago_user_id: 'seller-test',
            status: 'connected',
            live_mode: false,
            token_expires_at: null,
            connected_at: '2026-02-01T00:00:00.000Z',
            updated_at: null,
          })
        }
        if (table === 'checkout_sessions') {
          return queryBuilder([
            {
              id: 'chk-4',
              status: 'approved',
              amount: 55,
              mercado_pago_payment_id: 'pay-4',
              created_order_id: 'order-4',
              created_at: '2026-03-12T00:00:00.000Z',
            },
            {
              id: 'chk-5',
              status: 'rejected',
              amount: 55,
              mercado_pago_payment_id: null,
              created_order_id: null,
              created_at: '2026-03-13T00:00:00.000Z',
            },
          ])
        }
        if (table === 'orders') {
          return queryBuilder([
            {
              id: 'order-4',
              status: 'confirmed',
              payment_status: 'paid',
              total: 55,
              created_at: '2026-03-12T00:00:00.000Z',
            },
            {
              id: 'order-5',
              status: 'cancelled',
              payment_status: 'refunded',
              total: 55,
              created_at: '2026-03-13T00:00:00.000Z',
            },
          ])
        }
        if (table === 'admin_tenant_events') {
          return queryBuilder([
            {
              id: 'event-4',
              message: 'Tenant suspenso por chargeback',
              created_at: '2026-03-14T10:00:00.000Z',
            },
          ])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminTenantDetailsPage } = await import('@/app/admin/tenants/[id]/page')
    const markup = renderToStaticMarkup(
      await AdminTenantDetailsPage({
        params: Promise.resolve({ id: 'tenant-4' }),
      }),
    )

    expect(markup).toContain('Suspenso')
    expect(markup).toContain('Motivo da suspensão: Chargeback')
    expect(markup).toContain('Teste · seller seller-test')
    expect(markup).toContain('1 pagos · 1 reembolsados')
    expect(markup).toContain('Aprovadas')
    expect(markup).toContain('Rejeitadas')
  })

  it('renderiza detalhe admin ativo com conta em produção e listas nulas', async () => {
    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'admin_tenants') {
          return queryBuilder({
            id: 'tenant-5',
            name: 'Massas VIP',
            slug: 'massas-vip',
            plan: 'pro',
            status: 'active',
            created_at: '2026-02-10T00:00:00.000Z',
            suspended_at: null,
            suspension_reason: null,
            next_billing_at: '2026-03-29T00:00:00.000Z',
            total_users: 9,
            total_orders: 41,
            total_revenue: 3210,
            last_order_at: '2026-03-20T00:00:00.000Z',
          })
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder({
            provider: 'mercado_pago',
            mercado_pago_user_id: 'seller-live',
            status: 'connected',
            live_mode: true,
            token_expires_at: '2026-04-01T00:00:00.000Z',
            connected_at: '2026-02-11T00:00:00.000Z',
            updated_at: '2026-03-15T00:00:00.000Z',
          })
        }
        if (table === 'checkout_sessions') {
          return queryBuilder(null)
        }
        if (table === 'orders') {
          return queryBuilder(null)
        }
        if (table === 'admin_tenant_events') {
          return queryBuilder([])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminTenantDetailsPage } = await import('@/app/admin/tenants/[id]/page')
    const markup = renderToStaticMarkup(
      await AdminTenantDetailsPage({
        params: Promise.resolve({ id: 'tenant-5' }),
      }),
    )

    expect(markup).toContain('Ativo')
    expect(markup).toContain('Massas VIP')
    expect(markup).toContain('Produção · seller seller-live')
    expect(markup).toContain('0 pagos · 0 reembolsados')
    expect(markup).toContain('0 pendentes')
    expect(markup).toContain('Nenhuma sessão recente.')
    expect(markup).toContain('Nenhum evento administrativo registrado ainda.')
  })

  it('aciona notFound no detalhe admin quando tenant não existe', async () => {
    createAdminClientMock.mockReturnValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'admin_tenants') {
          return queryBuilder(null)
        }
        if (table === 'tenant_payment_accounts') {
          return queryBuilder(null)
        }
        if (table === 'checkout_sessions' || table === 'orders' || table === 'admin_tenant_events') {
          return queryBuilder([])
        }

        return queryBuilder(null)
      }),
    })

    const { default: AdminTenantDetailsPage } = await import('@/app/admin/tenants/[id]/page')

    await expect(
      AdminTenantDetailsPage({
        params: Promise.resolve({ id: 'missing-tenant' }),
      }),
    ).rejects.toThrow('not-found')
    expect(notFoundMock).toHaveBeenCalled()
  })

  it('redireciona o detalhe admin para login quando não existe usuário autenticado', async () => {
    createClientMock.mockReturnValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null } })),
      },
      from: vi.fn(() => queryBuilder({ is_admin: true })),
    })

    const { default: AdminTenantDetailsPage } = await import('@/app/admin/tenants/[id]/page')

    await expect(
      AdminTenantDetailsPage({
        params: Promise.resolve({ id: 'tenant-1' }),
      }),
    ).rejects.toThrow('redirect:/login')
    expect(redirectMock).toHaveBeenCalledWith('/login')
  })

  it('redireciona o detalhe admin para dashboard quando o perfil não é admin', async () => {
    createClientMock.mockReturnValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'staff-1' } } })),
      },
      from: vi.fn(() => queryBuilder({ is_admin: false })),
    })

    const { default: AdminTenantDetailsPage } = await import('@/app/admin/tenants/[id]/page')

    await expect(
      AdminTenantDetailsPage({
        params: Promise.resolve({ id: 'tenant-1' }),
      }),
    ).rejects.toThrow('redirect:/dashboard')
    expect(redirectMock).toHaveBeenCalledWith('/dashboard')
  })

  it('renderiza tabela admin de tenants com vazio e potencial de upgrade', async () => {
    const { AdminTenantsTable } = await import('@/features/admin/AdminTenantsTable')

    const loadingMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantsTable, {
        loading: true,
        filtered: [],
        paginated: [],
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        onManage: vi.fn(),
      }),
    )

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

    expect(loadingMarkup).toContain('Carregando...')
    expect(emptyMarkup).toContain('Nenhum estabelecimento encontrado.')
    expect(tableMarkup).toContain('ChefOps House')
    expect(tableMarkup).toContain('Potencial de upgrade')
    expect(tableMarkup).toContain('Detalhes')
    expect(tableMarkup).toContain('Gerenciar')

    const fallbackMarkup = renderToStaticMarkup(
      React.createElement(AdminTenantsTable, {
        loading: false,
        filtered: [
          {
            id: 'tenant-2',
            name: 'Bistro Azul',
            slug: 'bistro-azul',
            plan: 'basic',
            status: 'inactive',
            created_at: '2026-03-01T00:00:00.000Z',
            suspended_at: null,
            suspension_reason: null,
            next_billing_at: null,
            total_users: 1,
            total_orders: 2,
            total_revenue: null,
            last_order_at: null,
          },
        ],
        paginated: [
          {
            id: 'tenant-2',
            name: 'Bistro Azul',
            slug: 'bistro-azul',
            plan: 'basic',
            status: 'inactive',
            created_at: '2026-03-01T00:00:00.000Z',
            suspended_at: null,
            suspension_reason: null,
            next_billing_at: null,
            total_users: 1,
            total_orders: 2,
            total_revenue: null,
            last_order_at: null,
          },
        ],
        page: 1,
        totalPages: 1,
        onPageChange: vi.fn(),
        onManage: vi.fn(),
      }),
    )

    expect(fallbackMarkup).toContain('Bistro Azul')
    expect(fallbackMarkup).toContain('Inativo')
    expect(fallbackMarkup).toContain('R$\u00a00,00')
    expect(fallbackMarkup).toContain('—')
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

  it('renderiza modal admin fechado quando não há tenant selecionado', async () => {
    const { AdminTenantManagementDialog } = await import('@/features/admin/AdminTenantManagementDialog')

    const markup = renderToStaticMarkup(
      React.createElement(AdminTenantManagementDialog, {
        selected: null,
        newPlan: 'free',
        newBillingDate: '',
        suspendReason: '',
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

    expect(markup).not.toContain('Motivo da suspensão')
    expect(markup).not.toContain('Salvar alterações')
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
    const dialogSelects = dialogElements.filter((element) => typeof element.props.onValueChange === 'function')

    dialogInputs.find((input) => input.props.type === 'date')?.props.onChange({ target: { value: '2026-04-01' } })
    dialogInputs.find((input) => input.props.placeholder?.includes('Inadimplência'))?.props.onChange({
      target: { value: 'Fatura vencida' },
    })
    dialogSelects[0]?.props.onValueChange('basic')
    dialogButtons.find((button) => getTextContent(button).includes('Salvar alterações'))?.props.onClick()
    dialogButtons.find((button) => getTextContent(button).includes('Suspender'))?.props.onClick()

    expect(onPlanChange).toHaveBeenCalledWith('basic')
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
