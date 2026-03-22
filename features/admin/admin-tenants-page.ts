export type AdminTenant = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'basic' | 'pro'
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  suspended_at: string | null
  suspension_reason: string | null
  next_billing_at: string | null
  total_users: number
  total_orders: number
  total_revenue: number
  last_order_at: string | null
}

export type AdminTenantPlanFilter = 'all' | 'free' | 'basic' | 'pro'
export type AdminTenantStatusFilter = 'all' | 'active' | 'inactive' | 'suspended'

export type AdminTenantDialogState = {
  newPlan: AdminTenant['plan']
  suspendReason: string
  newBillingDate: string
}

export type AdminTenantFilterSummary = {
  filteredCount: number
  freeCount: number
  paidCount: number
}

type AdminTenantFetch = typeof fetch

export function getAdminTenantTableHeaders() {
  return ['Estabelecimento', 'Plano', 'Status', 'Uso', 'Receita', 'Última atividade', 'Próx. cobrança', '']
}

export function buildAdminTenantCards(stats: ReturnType<typeof buildAdminTenantStats>, tenantCount: number) {
  return [
    {
      title: 'Base total',
      value: String(tenantCount),
      description: `${stats.active} ativos`,
      tone: 'sky',
    },
    {
      title: 'Suspensos',
      value: String(stats.suspended),
      description: 'Clientes com ação pendente',
      tone: 'red',
    },
    {
      title: 'Prontos para upgrade',
      value: String(stats.upgradeCandidates),
      description: 'Basic com uso acima da média',
      tone: 'amber',
    },
    {
      title: 'MRR estimado',
      value: formatCurrency(stats.monthlyRevenue),
      description: 'Baseado em Standard e Premium',
      tone: 'violet',
    },
  ] as const
}

export function buildSelectedTenantHighlights(tenant: AdminTenant) {
  return [
    { label: 'Slug', value: tenant.slug },
    { label: 'Cadastrado em', value: formatDate(tenant.created_at) },
    { label: 'Pedidos', value: String(tenant.total_orders) },
    { label: 'Receita total', value: formatCurrency(Number(tenant.total_revenue ?? 0)) },
  ]
}

export const statusConfig = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inativo', color: 'bg-slate-100 text-slate-600' },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-700' },
}

export const planConfig = {
  free: { label: 'Basic', color: 'bg-slate-100 text-slate-600' },
  basic: { label: 'Standard', color: 'bg-blue-100 text-blue-700' },
  pro: { label: 'Premium', color: 'bg-purple-100 text-purple-700' },
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function isUpgradeCandidate(tenant: AdminTenant) {
  return tenant.plan === 'free' && (
    tenant.total_orders >= 15 ||
    Number(tenant.total_revenue ?? 0) >= 500 ||
    tenant.total_users >= 2
  )
}

export function filterAdminTenants(
  tenants: AdminTenant[],
  search: string,
  planFilter: 'all' | 'free' | 'basic' | 'pro',
  statusFilter: 'all' | 'active' | 'inactive' | 'suspended'
) {
  return tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(search.toLowerCase())
    const matchesPlan = planFilter === 'all' || tenant.plan === planFilter
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter
    return matchesSearch && matchesPlan && matchesStatus
  })
}

export function buildAdminTenantStats(tenants: AdminTenant[]) {
  const active = tenants.filter((tenant) => tenant.status === 'active').length
  const suspended = tenants.filter((tenant) => tenant.status === 'suspended').length
  const upgradeCandidates = tenants.filter(isUpgradeCandidate).length
  const monthlyRevenue = tenants.reduce((sum, tenant) => {
    if (tenant.plan === 'basic') return sum + 89
    if (tenant.plan === 'pro') return sum + 189
    return sum
  }, 0)

  return { active, suspended, upgradeCandidates, monthlyRevenue }
}

export function buildAdminTenantDialogState(tenant: AdminTenant): AdminTenantDialogState {
  return {
    newPlan: tenant.plan,
    suspendReason: tenant.suspension_reason ?? '',
    newBillingDate: tenant.next_billing_at
      ? new Date(tenant.next_billing_at).toISOString().split('T')[0]
      : '',
  }
}

export function buildAdminTenantFilterSummary(
  tenants: AdminTenant[],
  filtered: AdminTenant[]
): AdminTenantFilterSummary {
  return {
    filteredCount: filtered.length,
    freeCount: tenants.filter((tenant) => tenant.plan === 'free').length,
    paidCount: tenants.filter((tenant) => tenant.plan !== 'free').length,
  }
}

export async function loadAdminTenants(fetchImpl: AdminTenantFetch = fetch) {
  const res = await fetchImpl('/api/admin/tenants')
  const json = await res.json()
  return (json.data ?? []) as AdminTenant[]
}

export function buildAdminTenantSavePayload(newPlan: AdminTenant['plan'], newBillingDate: string) {
  return {
    plan: newPlan,
    next_billing_at: newBillingDate ? new Date(newBillingDate).toISOString() : undefined,
  }
}

export function buildAdminTenantSuspendPayload(suspendReason: string) {
  return {
    status: 'suspended' as const,
    suspension_reason: suspendReason.trim() || 'Inadimplência',
  }
}

export function buildAdminTenantReactivatePayload() {
  return { status: 'active' as const }
}

export async function saveAdminTenantChanges(
  tenantId: string,
  newPlan: AdminTenant['plan'],
  newBillingDate: string,
  fetchImpl: AdminTenantFetch = fetch
) {
  return fetchImpl(`/api/admin/tenants/${tenantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAdminTenantSavePayload(newPlan, newBillingDate)),
  })
}

export async function suspendAdminTenant(
  tenantId: string,
  suspendReason: string,
  fetchImpl: AdminTenantFetch = fetch
) {
  return fetchImpl(`/api/admin/tenants/${tenantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAdminTenantSuspendPayload(suspendReason)),
  })
}

export async function reactivateAdminTenant(tenantId: string, fetchImpl: AdminTenantFetch = fetch) {
  return fetchImpl(`/api/admin/tenants/${tenantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildAdminTenantReactivatePayload()),
  })
}

export function paginateAdminTenants(tenants: AdminTenant[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(tenants.length / pageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)

  return {
    currentPage,
    totalPages,
    paginated: tenants.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  }
}

export function getAdminTenantPageReset() {
  return 1
}

export function getAdminTenantOpenState(tenant: AdminTenant) {
  return {
    selected: tenant,
    ...buildAdminTenantDialogState(tenant),
  }
}

export function getAdminTenantCloseState() {
  return null
}

export function getAdminTenantSavingState() {
  return true
}

export function getAdminTenantSavedState() {
  return {
    saving: false,
    selected: null,
  }
}
