import type { Product } from '@/features/products/types'

export type ProductStatusFilter = 'all' | 'active' | 'inactive'

export type ProductPlanInfo = {
  max_products?: number
} | null | undefined

export type ProductFormValues = {
  name: string
  sku?: string
  category_id?: string
  unit: Product['unit']
  cost_price: number
  min_stock: number
}

export const unitLabels: Record<string, string> = {
  un: 'Unidade',
  kg: 'Kg',
  g: 'Grama',
  l: 'Litro',
  ml: 'mL',
  cx: 'Caixa',
  pct: 'Pacote',
}

export function getDefaultProductFormValues(): ProductFormValues {
  return {
    name: '',
    sku: '',
    unit: 'un',
    cost_price: 0,
    min_stock: 0,
  }
}

export function getProductFormValues(product: Product | null): ProductFormValues {
  if (!product) {
    return getDefaultProductFormValues()
  }

  return {
    name: product.name,
    sku: product.sku || '',
    category_id: product.category_id || '',
    unit: product.unit,
    cost_price: product.cost_price,
    min_stock: product.min_stock,
  }
}

export function getProductActiveFilter(statusFilter: ProductStatusFilter) {
  if (statusFilter === 'all') return undefined
  return statusFilter === 'active'
}

export function getProductCategoryFilterValue(categoryFilter: string) {
  return categoryFilter === 'all' ? undefined : categoryFilter
}

export function isProductLimitReached(plan: ProductPlanInfo, canAddMoreProducts: boolean) {
  return !!plan && !canAddMoreProducts
}

export function getProductsPlanUsageText(plan: ProductPlanInfo, productCount: number) {
  if (!plan || plan.max_products === undefined || plan.max_products === -1) {
    return ''
  }

  return ` · ${productCount}/${plan.max_products} no plano`
}

export function getProductsTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}
