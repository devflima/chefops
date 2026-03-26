import { hasPlanFeature, type Plan, type PlanFeature } from '@/features/plans/types'

export type EstablishmentRole = 'owner' | 'manager' | 'cashier' | 'kitchen'

export type RoleLimits = Record<EstablishmentRole, number>
export type RoleCounts = Record<EstablishmentRole, number>

export const ROLE_LABELS: Record<EstablishmentRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen',
}

export const PLAN_ROLE_LIMITS: Record<Plan, RoleLimits> = {
  free: {
    owner: 1,
    manager: 1,
    cashier: 1,
    kitchen: 1,
  },
  basic: {
    owner: 1,
    manager: 1,
    cashier: 1,
    kitchen: 1,
  },
  pro: {
    owner: 2,
    manager: 5,
    cashier: 10,
    kitchen: 10,
  },
}

export const PLAN_MAX_USERS: Record<Plan, number> = {
  free: 2,
  basic: 4,
  pro: 27,
}

export const DASHBOARD_ROUTE_ROLES = [
  { path: '/dashboard', roles: ['owner', 'manager', 'cashier'] as EstablishmentRole[] },
  { path: '/categorias', roles: ['owner', 'manager'] as EstablishmentRole[], feature: 'menu' as PlanFeature },
  { path: '/produtos', roles: ['owner', 'manager'] as EstablishmentRole[], feature: 'menu' as PlanFeature },
  { path: '/estoque', roles: ['owner', 'manager'] as EstablishmentRole[], feature: 'stock' as PlanFeature },
  { path: '/cardapio', roles: ['owner', 'manager'] as EstablishmentRole[], feature: 'menu' as PlanFeature },
  { path: '/extras', roles: ['owner', 'manager'] as EstablishmentRole[], feature: 'menu' as PlanFeature },
  { path: '/pedidos', roles: ['owner', 'manager', 'cashier', 'kitchen'] as EstablishmentRole[], feature: 'orders' as PlanFeature },
  { path: '/entregadores', roles: ['owner', 'manager', 'cashier'] as EstablishmentRole[], feature: 'orders' as PlanFeature },
  { path: '/comandas', roles: ['owner', 'manager', 'cashier'] as EstablishmentRole[], feature: 'tables' as PlanFeature },
  { path: '/mesas', roles: ['owner', 'manager', 'cashier'] as EstablishmentRole[], feature: 'tables' as PlanFeature },
  { path: '/kds', roles: ['owner', 'manager', 'kitchen'] as EstablishmentRole[], feature: 'kds' as PlanFeature },
  { path: '/vendas', roles: ['owner', 'manager'] as EstablishmentRole[], feature: 'sales' as PlanFeature },
  { path: '/integracoes', roles: ['owner'] as EstablishmentRole[], feature: 'payments' as PlanFeature },
  { path: '/usuarios', roles: ['owner'] as EstablishmentRole[], feature: 'team' as PlanFeature },
  { path: '/planos', roles: ['owner'] as EstablishmentRole[] },
]

export function getRoleCounts(items: Array<{ role: string | null | undefined }>) {
  const counts: RoleCounts = {
    owner: 0,
    manager: 0,
    cashier: 0,
    kitchen: 0,
  }

  for (const item of items) {
    if (item.role && item.role in counts) {
      counts[item.role as EstablishmentRole] += 1
    }
  }

  return counts
}

export function getAvailableRolesForPlan(plan: Plan): EstablishmentRole[] {
  if (plan === 'free') {
    return ['manager', 'cashier', 'kitchen']
  }

  return ['owner', 'manager', 'cashier', 'kitchen']
}

export function canAssignRole(params: {
  plan: Plan
  counts: RoleCounts
  nextRole: EstablishmentRole
}) {
  const { plan, counts, nextRole } = params
  const roleLimits = PLAN_ROLE_LIMITS[plan]
  const totalUsers = Object.values(counts).reduce((sum, value) => sum + value, 0)

  if (totalUsers >= PLAN_MAX_USERS[plan]) {
    return false
  }

  return counts[nextRole] < roleLimits[nextRole]
}

export function formatRoleLabel(role: string | null | undefined) {
  if (!role) return 'Sem perfil'
  return ROLE_LABELS[role as EstablishmentRole] ?? role
}

export function canAccessDashboardPath(
  role: string | null | undefined,
  pathname: string,
  plan?: Plan | null
) {
  if (!role) return false

  const match = DASHBOARD_ROUTE_ROLES.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
  if (!match) return true

  if (!match.roles.includes(role as EstablishmentRole)) {
    return false
  }

  if (match.feature && plan && !hasPlanFeature(plan, match.feature)) {
    return false
  }

  return true
}
