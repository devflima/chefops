import type { Plan } from '@/features/plans/types'

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
  { path: '/categorias', roles: ['owner', 'manager'] as EstablishmentRole[] },
  { path: '/produtos', roles: ['owner', 'manager'] as EstablishmentRole[] },
  { path: '/estoque', roles: ['owner', 'manager'] as EstablishmentRole[] },
  { path: '/cardapio', roles: ['owner', 'manager'] as EstablishmentRole[] },
  { path: '/extras', roles: ['owner', 'manager'] as EstablishmentRole[] },
  { path: '/pedidos', roles: ['owner', 'manager', 'cashier', 'kitchen'] as EstablishmentRole[] },
  { path: '/entregadores', roles: ['owner', 'manager', 'cashier'] as EstablishmentRole[] },
  { path: '/comandas', roles: ['owner', 'manager', 'cashier'] as EstablishmentRole[] },
  { path: '/mesas', roles: ['owner', 'manager', 'cashier'] as EstablishmentRole[] },
  { path: '/kds', roles: ['owner', 'manager', 'kitchen'] as EstablishmentRole[] },
  { path: '/vendas', roles: ['owner', 'manager'] as EstablishmentRole[] },
  { path: '/integracoes', roles: ['owner'] as EstablishmentRole[] },
  { path: '/usuarios', roles: ['owner'] as EstablishmentRole[] },
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

export function canAccessDashboardPath(role: string | null | undefined, pathname: string) {
  if (!role) return false

  const match = DASHBOARD_ROUTE_ROLES.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
  if (!match) return true

  return match.roles.includes(role as EstablishmentRole)
}
