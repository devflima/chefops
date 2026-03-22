export const onboardingSteps = [
  {
    key: 'has_category' as const,
    title: 'Crie sua primeira categoria',
    description: 'Categorias organizam seu cardápio. Ex: Pizzas, Bebidas, Entradas.',
  },
  {
    key: 'has_product' as const,
    title: 'Cadastre um produto',
    description: 'Produtos são seus insumos para controle de estoque.',
  },
  {
    key: 'has_menu_item' as const,
    title: 'Adicione um item ao cardápio',
    description: 'Itens do cardápio são o que seus clientes vão pedir.',
  },
  {
    key: 'has_table' as const,
    title: 'Cadastre uma mesa',
    description: 'Mesas permitem abrir comandas e receber pedidos via QR Code.',
  },
]

export type OnboardingState = {
  has_category: boolean
  has_product: boolean
  has_menu_item: boolean
  has_table: boolean
  completed_at?: string | null
}

export function getOnboardingCompletedCount(onboarding: OnboardingState) {
  return onboardingSteps.filter((step) => onboarding[step.key]).length
}

export function getOnboardingProgress(onboarding: OnboardingState) {
  return (getOnboardingCompletedCount(onboarding) / onboardingSteps.length) * 100
}

export function getOnboardingActiveStep(onboarding: OnboardingState) {
  const firstIncomplete = onboardingSteps.findIndex((step) => !onboarding[step.key])
  return firstIncomplete === -1 ? onboardingSteps.length - 1 : firstIncomplete
}

export function shouldRenderOnboardingWizard(onboarding: OnboardingState | null, isLoading: boolean) {
  return !isLoading && !!onboarding && !onboarding.completed_at
}

export function buildCategoryPayload(values: { name: string }) {
  return { name: values.name, display_order: 0 }
}

export function buildProductPayload(values: { name: string; unit: string }) {
  return { name: values.name, unit: values.unit, cost_price: 0, min_stock: 0 }
}

export function buildMenuItemPayload(values: { name: string; price: number }) {
  return { name: values.name, price: values.price }
}

export function buildTablePayload(values: { number: string }) {
  return { number: values.number, capacity: 4 }
}

export function buildTableCompletionPayload(onboarding: OnboardingState) {
  return {
    has_category: onboarding.has_category,
    has_product: onboarding.has_product,
    has_menu_item: onboarding.has_menu_item,
    has_table: true,
  }
}
