import { describe, expect, it, vi } from 'vitest'

import {
  addDays,
  buildAdminOverview,
  formatCurrency as formatAdminCurrency,
  formatDate as formatAdminDate,
  formatDelta,
  getEnvironmentLabel,
  getHostname,
  startOfDay,
} from '@/features/admin/admin-page'
import {
  buildAdminTenantDialogState,
  buildAdminTenantFilterSummary,
  buildAdminTenantCards,
  getAdminTenantCloseState,
  getAdminTenantOpenState,
  getAdminTenantPageReset,
  getAdminTenantSavedState,
  getAdminTenantSavingState,
  buildAdminTenantReactivatePayload,
  buildAdminTenantSavePayload,
  buildAdminTenantSuspendPayload,
  buildAdminTenantStats,
  buildSelectedTenantHighlights,
  filterAdminTenants,
  formatCurrency as formatTenantCurrency,
  formatDate as formatTenantDate,
  getAdminTenantTableHeaders,
  isUpgradeCandidate,
  loadAdminTenants,
  paginateAdminTenants,
  planConfig,
  reactivateAdminTenant,
  saveAdminTenantChanges,
  suspendAdminTenant,
  statusConfig,
} from '@/features/admin/admin-tenants-page'

describe('admin helpers', () => {
  it('normaliza datas, ambiente e deltas do dashboard admin', () => {
    const base = new Date('2026-03-21T15:30:00.000Z')
    const normalized = startOfDay(base)
    expect(normalized.getHours()).toBe(0)
    expect(normalized.getMinutes()).toBe(0)
    expect(normalized.getSeconds()).toBe(0)
    expect(normalized.getMilliseconds()).toBe(0)
    expect(addDays(base, 7).getDate()).toBeGreaterThanOrEqual(27)
    expect(formatAdminCurrency(189)).toContain('189')
    expect(formatAdminDate(null)).toBe('—')
    expect(formatDelta(10, 0)).toBe('+100%')
    expect(formatDelta(10, 20)).toBe('-50%')
    expect(getEnvironmentLabel('http://localhost:3000')).toBe('Desenvolvimento')
    expect(getEnvironmentLabel('https://chefops.app')).toBe('Produção')
    expect(getHostname('https://chefops.app')).toBe('chefops.app')
  })

  it('monta resumo consolidado do admin', () => {
    const overview = buildAdminOverview({
      now: new Date('2026-03-21T12:00:00.000Z'),
      tenants: [
        {
          id: 'tenant-1',
          name: 'ChefOps',
          slug: 'chefops',
          plan: 'free',
          status: 'active',
          created_at: '2026-03-10T00:00:00.000Z',
          next_billing_at: '2026-03-24T00:00:00.000Z',
        },
        {
          id: 'tenant-2',
          name: 'Sushi',
          slug: 'sushi',
          plan: 'pro',
          status: 'suspended',
          created_at: '2026-02-01T00:00:00.000Z',
          next_billing_at: '2026-03-15T00:00:00.000Z',
        },
      ],
      orders: [
        { total: 100, created_at: '2026-03-20T00:00:00.000Z', payment_status: 'paid' },
        { total: 80, created_at: '2026-02-15T00:00:00.000Z', payment_status: 'paid' },
      ],
      accounts: [{ tenant_id: 'tenant-1', status: 'connected', live_mode: true }],
      adminTenants: [
        {
          id: 'tenant-1',
          name: 'ChefOps',
          slug: 'chefops',
          plan: 'free',
          status: 'active',
          total_users: 2,
          total_orders: 20,
          total_revenue: 700,
          next_billing_at: '2026-03-24T00:00:00.000Z',
          last_order_at: '2026-03-20T00:00:00.000Z',
        },
      ],
      saasSubscriptions: [
        {
          tenant_id: 'tenant-1',
          plan: 'basic',
          status: 'authorized',
          next_payment_date: '2026-03-24T00:00:00.000Z',
          cancel_at_period_end: false,
          scheduled_plan: 'pro',
        },
      ],
      appUrl: 'https://chefops.app',
      hasCentralToken: true,
      hasWebhookSecret: true,
    })

    expect(overview.activeTenants).toHaveLength(1)
    expect(overview.suspendedTenants).toHaveLength(1)
    expect(overview.revenue30d).toBe(100)
    expect(overview.connectedAccounts).toHaveLength(1)
    expect(overview.planCounts.free).toBe(1)
    expect(overview.upgradeCandidates).toHaveLength(1)
    expect(overview.activeSaasSubscriptions).toHaveLength(1)
    expect(overview.centralBillingConfigured).toBe(true)
    expect(overview.centralBillingEnvironment).toBe('Produção')
  })

  it('filtra tenants admin e calcula stats de upgrade e mrr', () => {
    const tenants = [
      {
        id: 'tenant-1',
        name: 'ChefOps',
        slug: 'chefops',
        plan: 'free',
        status: 'active',
        created_at: '',
        suspended_at: null,
        suspension_reason: null,
        next_billing_at: null,
        total_users: 2,
        total_orders: 20,
        total_revenue: 700,
        last_order_at: null,
      },
      {
        id: 'tenant-2',
        name: 'Sushi',
        slug: 'sushi-bar',
        plan: 'pro',
        status: 'suspended',
        created_at: '',
        suspended_at: null,
        suspension_reason: null,
        next_billing_at: null,
        total_users: 1,
        total_orders: 4,
        total_revenue: 100,
        last_order_at: null,
      },
    ] as const

    expect(isUpgradeCandidate(tenants[0])).toBe(true)
    expect(filterAdminTenants([...tenants], 'chef', 'all', 'active')).toHaveLength(1)
    expect(buildAdminTenantStats([...tenants])).toEqual({
      active: 1,
      suspended: 1,
      upgradeCandidates: 1,
      monthlyRevenue: 189,
    })
    expect(formatTenantCurrency(89)).toContain('89')
    expect(formatTenantDate(null)).toBe('—')
    expect(planConfig.pro.label).toBe('Premium')
    expect(statusConfig.suspended.label).toBe('Suspenso')
  })

  it('cobre fallbacks de highlights, upgrade negativo e load sem data', async () => {
    const tenant = {
      id: 'tenant-3',
      name: 'Padaria Sol',
      slug: 'padaria-sol',
      plan: 'free',
      status: 'inactive',
      created_at: '2026-03-05T00:00:00.000Z',
      suspended_at: null,
      suspension_reason: null,
      next_billing_at: null,
      total_users: 1,
      total_orders: 2,
      total_revenue: null,
      last_order_at: null,
    }

    const fetchMock = vi.fn(async () => ({
      json: async () => ({ data: null }),
    })) as unknown as typeof fetch

    expect(isUpgradeCandidate(tenant)).toBe(false)
    expect(buildSelectedTenantHighlights(tenant)).toEqual([
      { label: 'Slug', value: 'padaria-sol' },
      { label: 'Cadastrado em', value: expect.any(String) },
      { label: 'Pedidos', value: '2' },
      { label: 'Receita total', value: expect.stringContaining('0') },
    ])
    await expect(loadAdminTenants(fetchMock)).resolves.toEqual([])
  })

  it('prepara estado do modal, resumo de filtros e paginação do admin', () => {
    const tenants = [
      {
        id: 'tenant-1',
        name: 'ChefOps',
        slug: 'chefops',
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
      {
        id: 'tenant-2',
        name: 'Sushi',
        slug: 'sushi',
        plan: 'pro',
        status: 'suspended',
        created_at: '2026-03-01T00:00:00.000Z',
        suspended_at: '2026-03-10T00:00:00.000Z',
        suspension_reason: 'Inadimplência',
        next_billing_at: null,
        total_users: 1,
        total_orders: 3,
        total_revenue: 100,
        last_order_at: null,
      },
    ]

    expect(buildAdminTenantDialogState(tenants[0])).toEqual({
      newPlan: 'free',
      suspendReason: '',
      newBillingDate: '2026-03-24',
    })
    expect(buildAdminTenantDialogState(tenants[1])).toEqual({
      newPlan: 'pro',
      suspendReason: 'Inadimplência',
      newBillingDate: '',
    })
    expect(getAdminTenantOpenState(tenants[0])).toEqual({
      selected: tenants[0],
      newPlan: 'free',
      suspendReason: '',
      newBillingDate: '2026-03-24',
    })
    expect(getAdminTenantCloseState()).toBeNull()
    expect(getAdminTenantPageReset()).toBe(1)
    expect(getAdminTenantSavingState()).toBe(true)
    expect(getAdminTenantSavedState()).toEqual({
      saving: false,
      selected: null,
    })

    expect(buildAdminTenantFilterSummary(tenants, [tenants[0]])).toEqual({
      filteredCount: 1,
      freeCount: 1,
      paidCount: 1,
    })

    expect(getAdminTenantTableHeaders()).toEqual([
      'Estabelecimento',
      'Plano',
      'Status',
      'Uso',
      'Receita',
      'Última atividade',
      'Próx. cobrança',
      '',
    ])

    expect(buildAdminTenantCards({ active: 1, suspended: 1, upgradeCandidates: 1, monthlyRevenue: 189 }, 2))
      .toMatchObject([
        { title: 'Base total', value: '2' },
        { title: 'Suspensos', value: '1' },
        { title: 'Prontos para upgrade', value: '1' },
        { title: 'MRR estimado' },
      ])

    expect(buildSelectedTenantHighlights(tenants[0])).toEqual([
      { label: 'Slug', value: 'chefops' },
      { label: 'Cadastrado em', value: expect.any(String) },
      { label: 'Pedidos', value: '20' },
      { label: 'Receita total', value: expect.stringContaining('700') },
    ])

    expect(paginateAdminTenants(tenants, 2, 1)).toEqual({
      currentPage: 2,
      totalPages: 2,
      paginated: [tenants[1]],
    })
    expect(paginateAdminTenants(tenants, 99, 10).currentPage).toBe(1)
  })

  it('monta payloads e chama APIs do admin de tenants', async () => {
    const fetchMock = Object.assign(
      vi.fn(async () => ({
        json: async () => ({
          data: [
            {
              id: 'tenant-1',
              name: 'ChefOps',
              slug: 'chefops',
              plan: 'free',
              status: 'active',
              created_at: '2026-03-01T00:00:00.000Z',
              suspended_at: null,
              suspension_reason: null,
              next_billing_at: null,
              total_users: 2,
              total_orders: 20,
              total_revenue: 700,
              last_order_at: '2026-03-20T00:00:00.000Z',
            },
          ],
        }),
      })),
      { preconnect: vi.fn() }
    ) as unknown as typeof fetch

    expect(buildAdminTenantSavePayload('basic', '2026-04-01')).toEqual({
      plan: 'basic',
      next_billing_at: '2026-04-01T00:00:00.000Z',
    })
    expect(buildAdminTenantSavePayload('pro', '')).toEqual({
      plan: 'pro',
      next_billing_at: undefined,
    })
    expect(buildAdminTenantSuspendPayload('  ')).toEqual({
      status: 'suspended',
      suspension_reason: 'Inadimplência',
    })
    expect(buildAdminTenantSuspendPayload('Chargeback')).toEqual({
      status: 'suspended',
      suspension_reason: 'Chargeback',
    })
    expect(buildAdminTenantReactivatePayload()).toEqual({ status: 'active' })

    await expect(loadAdminTenants(fetchMock)).resolves.toHaveLength(1)
    await saveAdminTenantChanges('tenant-1', 'basic', '2026-04-01', fetchMock)
    await suspendAdminTenant('tenant-1', 'Fatura vencida', fetchMock)
    await reactivateAdminTenant('tenant-1', fetchMock)

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/tenants')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/tenants/tenant-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'basic',
        next_billing_at: '2026-04-01T00:00:00.000Z',
      }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/admin/tenants/tenant-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'suspended',
        suspension_reason: 'Fatura vencida',
      }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/admin/tenants/tenant-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'active',
      }),
    })
  })
})
