import { PLAN_PRICES, type Plan } from '@/features/plans/types'

export type TenantRow = {
  id: string
  name: string
  slug: string
  plan: Plan
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  next_billing_at: string | null
}

export type OrderRow = {
  total: number | string | null
  created_at: string
  payment_status: string | null
}

export type PaymentAccountRow = {
  tenant_id: string
  status: string
  live_mode: boolean | null
}

export type AdminTenantRow = {
  id: string
  name: string
  slug: string
  plan: Plan
  status: string
  total_users: number
  total_orders: number
  total_revenue: number
  next_billing_at: string | null
  last_order_at: string | null
}

export type SaasBillingSubscriptionRow = {
  tenant_id: string
  plan: Plan
  status: string
  next_payment_date: string | null
  cancel_at_period_end: boolean | null
  scheduled_plan: Plan | null
}

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
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

export function formatDelta(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? '+100%' : '0%'
  }

  const delta = ((current - previous) / previous) * 100
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(0)}%`
}

export function getEnvironmentLabel(appUrl?: string | null) {
  if (!appUrl) return 'Não configurado'

  try {
    const hostname = new URL(appUrl).hostname
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'Desenvolvimento'
    }

    return 'Produção'
  } catch {
    return 'Configuração inválida'
  }
}

export function getHostname(appUrl?: string | null) {
  if (!appUrl) return 'URL não configurada'

  try {
    return new URL(appUrl).hostname
  } catch {
    return appUrl
  }
}

export function buildAdminOverview(input: {
  now: Date
  tenants: TenantRow[]
  orders: OrderRow[]
  accounts: PaymentAccountRow[]
  adminTenants: AdminTenantRow[]
  saasSubscriptions: SaasBillingSubscriptionRow[]
  appUrl?: string | null
  hasCentralToken: boolean
  hasWebhookSecret: boolean
}) {
  const today = startOfDay(input.now)
  const thirtyDaysAgo = addDays(today, -30)
  const sixtyDaysAgo = addDays(today, -60)
  const nextSevenDays = addDays(today, 7)

  const activeTenants = input.tenants.filter((tenant) => tenant.status === 'active')
  const suspendedTenants = input.tenants.filter((tenant) => tenant.status === 'suspended')
  const newTenants30d = input.tenants.filter((tenant) => new Date(tenant.created_at) >= thirtyDaysAgo)
  const previousNewTenants = input.tenants.filter((tenant) => {
    const createdAt = new Date(tenant.created_at)
    return createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo
  })

  const paidOrders30d = input.orders.filter((order) => {
    const createdAt = new Date(order.created_at)
    return order.payment_status === 'paid' && createdAt >= thirtyDaysAgo
  })
  const previousPaidOrders = input.orders.filter((order) => {
    const createdAt = new Date(order.created_at)
    return order.payment_status === 'paid' && createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo
  })

  const revenue30d = paidOrders30d.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
  const previousRevenue = previousPaidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0)

  const connectedAccounts = input.accounts.filter((account) => account.status === 'connected')
  const liveAccounts = connectedAccounts.filter((account) => account.live_mode)
  const connectedTenantIds = new Set(connectedAccounts.map((account) => account.tenant_id))

  const upcomingBilling = activeTenants.filter((tenant) => {
    if (!tenant.next_billing_at) return false
    const billingAt = new Date(tenant.next_billing_at)
    return billingAt >= today && billingAt <= nextSevenDays
  })

  const overdueBilling = activeTenants.filter((tenant) => {
    if (!tenant.next_billing_at) return false
    return new Date(tenant.next_billing_at) < today
  })

  const mrrEstimate = activeTenants.reduce((sum, tenant) => sum + PLAN_PRICES[tenant.plan], 0)
  const planCounts = {
    free: input.tenants.filter((tenant) => tenant.plan === 'free').length,
    basic: input.tenants.filter((tenant) => tenant.plan === 'basic').length,
    pro: input.tenants.filter((tenant) => tenant.plan === 'pro').length,
  }

  const tenantsWithoutPayments = activeTenants.filter((tenant) => !connectedTenantIds.has(tenant.id))
  const activePaidTenants = activeTenants.filter((tenant) => tenant.plan !== 'free')
  const basicPlanTenants = activeTenants.filter((tenant) => tenant.plan === 'free')
  const upgradeCandidates = input.adminTenants.filter((tenant) => {
    const isBasicPlan = tenant.plan === 'free' && tenant.status === 'active'
    const hasPaymentConnection = connectedTenantIds.has(tenant.id)
    return isBasicPlan && (tenant.total_orders >= 15 || Number(tenant.total_revenue ?? 0) >= 500 || hasPaymentConnection)
  })
  const attentionTenants = input.adminTenants.filter((tenant) => {
    const noPaymentConnection = !connectedTenantIds.has(tenant.id)
    const suspended = tenant.status === 'suspended'
    const billingDelayed = tenant.next_billing_at ? new Date(tenant.next_billing_at) < today : false
    return noPaymentConnection || suspended || billingDelayed
  })
  const activeSaasSubscriptions = input.saasSubscriptions.filter((subscription) => subscription.status === 'authorized')
  const pendingSaasSubscriptions = input.saasSubscriptions.filter((subscription) => subscription.status === 'pending')
  const cancelAtPeriodEndSubscriptions = input.saasSubscriptions.filter((subscription) => Boolean(subscription.cancel_at_period_end))
  const scheduledPlanChanges = input.saasSubscriptions.filter((subscription) => Boolean(subscription.scheduled_plan))

  const centralBillingConfigured = Boolean(
    input.hasCentralToken &&
    input.hasWebhookSecret &&
    input.appUrl
  )

  return {
    activeTenants,
    suspendedTenants,
    newTenants30d,
    previousNewTenants,
    paidOrders30d,
    previousPaidOrders,
    revenue30d,
    previousRevenue,
    connectedAccounts,
    liveAccounts,
    connectedTenantIds,
    upcomingBilling,
    overdueBilling,
    mrrEstimate,
    planCounts,
    tenantsWithoutPayments,
    activePaidTenants,
    basicPlanTenants,
    upgradeCandidates,
    attentionTenants,
    activeSaasSubscriptions,
    pendingSaasSubscriptions,
    cancelAtPeriodEndSubscriptions,
    scheduledPlanChanges,
    centralBillingConfigured,
    centralBillingEnvironment: getEnvironmentLabel(input.appUrl),
    billingHostname: getHostname(input.appUrl),
    centralBillingReadiness: [
      { label: 'Token central', ready: input.hasCentralToken },
      { label: 'Webhook assinado', ready: input.hasWebhookSecret },
      { label: 'URL pública', ready: Boolean(input.appUrl) },
    ],
  }
}
