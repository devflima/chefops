import type { EstablishmentRole, RoleLimits } from '@/lib/rbac'

export type PlanFeature =
  | 'orders'
  | 'menu'
  | 'tables'
  | 'kds'
  | 'stock'
  | 'stock_automation'
  | 'sales'
  | 'payments'
  | 'whatsapp_notifications'
  | 'team'
  | 'reports'
  | 'white_label'

export type Plan = 'free' | 'basic' | 'pro'

export type TenantPlan = {
  plan: Plan
  max_users: number
  max_tables: number
  max_products: number
  resource_limits?: {
    categories: number
    extras: number
    menu_items: number
  }
  features: PlanFeature[]
  role_limits?: RoleLimits
  available_roles?: EstablishmentRole[]
  trial_ends_at: string | null
  plan_ends_at: string | null
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Basic',
  basic: 'Standard',
  pro: 'Premium',
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
    'Até 50 pedidos online por mês',
    'Integração com pagamento',
  ],
  basic: [
    '1 owner, 1 manager, 1 cashier e 1 kitchen',
    'Produtos ilimitados',
    'Até 10 mesas e comandas',
    'KDS — tela da cozinha',
    'Controle de estoque',
    'Baixa automática por ficha técnica',
    'Dashboard de vendas',
    'Notificações por WhatsApp',
    'Equipe com perfis por função',
    'Suporte por email',
  ],
  pro: [
    'Até 27 usuários por operação',
    '2 owners, 5 managers, 10 cashiers e 10 kitchen',
    'Mesas ilimitadas',
    'Tudo do Standard',
    'Relatórios avançados',
    'White-label',
    'Suporte prioritário',
  ],
}

export const PLAN_INCLUDED_FEATURES: Record<Plan, PlanFeature[]> = {
  free: ['orders', 'menu', 'tables', 'payments', 'team'],
  basic: ['orders', 'menu', 'tables', 'kds', 'stock', 'stock_automation', 'sales', 'payments', 'whatsapp_notifications', 'team'],
  pro: ['orders', 'menu', 'tables', 'kds', 'stock', 'stock_automation', 'sales', 'payments', 'whatsapp_notifications', 'team', 'reports', 'white_label'],
}

export const PLAN_RESOURCE_LIMITS: Record<Plan, TenantPlan['resource_limits']> = {
  free: {
    categories: 10,
    extras: 20,
    menu_items: 30,
  },
  basic: {
    categories: -1,
    extras: -1,
    menu_items: -1,
  },
  pro: {
    categories: -1,
    extras: -1,
    menu_items: -1,
  },
}

export function hasPlanFeature(plan: Plan, feature: PlanFeature) {
  return PLAN_INCLUDED_FEATURES[plan].includes(feature)
}
