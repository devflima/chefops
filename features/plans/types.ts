import type { EstablishmentRole, RoleLimits } from '@/lib/rbac'

export type PlanFeature =
  | 'orders'
  | 'menu'
  | 'tables'
  | 'kds'
  | 'stock'
  | 'sales'
  | 'reports'
  | 'white_label'

export type Plan = 'free' | 'basic' | 'pro'

export type TenantPlan = {
  plan: Plan
  max_users: number
  max_tables: number
  max_products: number
  features: PlanFeature[]
  role_limits?: RoleLimits
  available_roles?: EstablishmentRole[]
  trial_ends_at: string | null
  plan_ends_at: string | null
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
}

export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  basic: 89,
  pro: 189,
}

export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    '1 owner + 1 usuário adicional',
    'Até 20 produtos',
    'Cardápio digital público',
    'Pedidos online ilimitados',
  ],
  basic: [
    '1 owner, 1 manager, 1 cashier e 1 kitchen',
    'Produtos ilimitados',
    'Até 10 mesas e comandas',
    'KDS — tela da cozinha',
    'Controle de estoque',
    'Dashboard de vendas',
    'Suporte por email',
  ],
  pro: [
    'Até 27 usuários por operação',
    '2 owners, 5 managers, 10 cashiers e 10 kitchen',
    'Mesas ilimitadas',
    'Tudo do Basic',
    'Relatórios avançados',
    'White-label',
    'Suporte prioritário',
  ],
}
