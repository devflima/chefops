import { PLAN_INCLUDED_FEATURES, PLAN_RESOURCE_LIMITS, type Plan } from '@/features/plans/types'
import { getAvailableRolesForPlan, PLAN_MAX_USERS, PLAN_ROLE_LIMITS } from '@/lib/rbac'

export const PLAN_MAX_TABLES: Record<Plan, number> = {
  free: 0,
  basic: 10,
  pro: -1,
}

export const PLAN_MAX_PRODUCTS: Record<Plan, number> = {
  free: 20,
  basic: -1,
  pro: -1,
}

export function getPersistedTenantPlanSnapshot(plan: Plan) {
  return {
    plan,
    max_users: PLAN_MAX_USERS[plan],
    max_tables: PLAN_MAX_TABLES[plan],
    max_products: PLAN_MAX_PRODUCTS[plan],
    features: PLAN_INCLUDED_FEATURES[plan],
  }
}

export function getTenantPlanSnapshot(plan: Plan) {
  return {
    ...getPersistedTenantPlanSnapshot(plan),
    resource_limits: PLAN_RESOURCE_LIMITS[plan],
    role_limits: PLAN_ROLE_LIMITS[plan],
    available_roles: getAvailableRolesForPlan(plan),
  }
}

export function getPlanResourceLimit(
  plan: Plan,
  resource: keyof NonNullable<ReturnType<typeof getTenantPlanSnapshot>['resource_limits']>
) {
  return PLAN_RESOURCE_LIMITS[plan]?.[resource] ?? -1
}
