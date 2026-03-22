import type { Category } from '@/features/products/types'

export type CategoryDestinationFilter = 'all' | 'kitchen' | 'counter'

export type CategoryPlanInfo = {
  resource_limits?: {
    categories?: number
  }
} | null | undefined

export type CategoryFormValues = {
  name: string
  display_order: number
  goes_to_kitchen: boolean
}

export function getDefaultCategoryFormValues(): CategoryFormValues {
  return {
    name: '',
    display_order: 0,
    goes_to_kitchen: true,
  }
}

export function getCategoryFormValues(category: Category | null): CategoryFormValues {
  if (!category) {
    return getDefaultCategoryFormValues()
  }

  return {
    name: category.name,
    display_order: category.display_order,
    goes_to_kitchen: category.goes_to_kitchen,
  }
}

export function filterCategories(
  categories: Category[],
  destinationFilter: CategoryDestinationFilter,
  nameFilter: string,
) {
  const normalizedNameFilter = nameFilter.trim().toLowerCase()

  return categories.filter((category) => {
    if (destinationFilter === 'kitchen' && !category.goes_to_kitchen) return false
    if (destinationFilter === 'counter' && category.goes_to_kitchen) return false
    if (normalizedNameFilter && !category.name.toLowerCase().includes(normalizedNameFilter)) return false
    return true
  })
}

export function paginateCategories(categories: Category[], page: number, pageSize: number) {
  const safePage = Math.max(1, page)
  return categories.slice((safePage - 1) * pageSize, safePage * pageSize)
}

export function getCategoryTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function isCategoryLimitReached(plan: CategoryPlanInfo, canAddMoreCategories: boolean) {
  return !!plan && !canAddMoreCategories
}

export function getCategoryPlanUsageText(plan: CategoryPlanInfo, categoryCount: number) {
  if (plan?.resource_limits?.categories === undefined || plan.resource_limits.categories === -1) {
    return ''
  }

  return ` · ${categoryCount}/${plan.resource_limits.categories} no plano`
}
