export type ExtraCategory = 'border' | 'flavor' | 'other'
export type ExtraCategoryFilter = 'all' | ExtraCategory

export type Extra = {
  id: string
  name: string
  price: number
  category: ExtraCategory
  target_categories: string[]
  active: boolean
}

export type ExtraPlanInfo = {
  resource_limits?: {
    extras?: number
  }
} | null | undefined

export type ExtraFormValues = {
  name: string
  price: number
  category: ExtraCategory
  target_categories: string[]
}

export function getDefaultExtraFormValues(): ExtraFormValues {
  return {
    name: '',
    price: 0,
    category: 'other',
    target_categories: [],
  }
}

export function getExtraFormValues(extra: Extra | null): ExtraFormValues {
  if (!extra) {
    return getDefaultExtraFormValues()
  }

  return {
    name: extra.name,
    price: extra.price,
    category: extra.category,
    target_categories: extra.target_categories ?? [],
  }
}

export function filterExtras(extras: Extra[], categoryFilter: ExtraCategoryFilter, nameFilter: string) {
  const normalizedNameFilter = nameFilter.trim().toLowerCase()

  return extras.filter((extra) => {
    if (categoryFilter !== 'all' && extra.category !== categoryFilter) return false
    if (normalizedNameFilter && !extra.name.toLowerCase().includes(normalizedNameFilter)) return false
    return true
  })
}

export function paginateExtras(extras: Extra[], page: number, pageSize: number) {
  const safePage = Math.max(1, page)
  return extras.slice((safePage - 1) * pageSize, safePage * pageSize)
}

export function getExtrasTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function isExtrasLimitReached(plan: ExtraPlanInfo, canAddMoreExtras: boolean) {
  return !!plan && !canAddMoreExtras
}

export function getExtrasPlanUsageText(plan: ExtraPlanInfo, extrasCount: number) {
  if (plan?.resource_limits?.extras === undefined || plan.resource_limits.extras === -1) {
    return ''
  }

  return ` · ${extrasCount}/${plan.resource_limits.extras} no plano`
}
