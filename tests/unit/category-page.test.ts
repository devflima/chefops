import { describe, expect, it } from 'vitest'

import {
  filterCategories,
  getCategoryFormValues,
  getCategoryPlanUsageText,
  getCategoryTotalPages,
  getDefaultCategoryFormValues,
  isCategoryLimitReached,
  paginateCategories,
} from '@/features/products/category-page'

const categories = [
  {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'Bebidas',
    display_order: 2,
    created_at: '2026-03-21T00:00:00.000Z',
    goes_to_kitchen: false,
  },
  {
    id: '2',
    tenant_id: 'tenant-1',
    name: 'Pizzas',
    display_order: 1,
    created_at: '2026-03-21T00:00:00.000Z',
    goes_to_kitchen: true,
  },
  {
    id: '3',
    tenant_id: 'tenant-1',
    name: 'Entradas',
    display_order: 3,
    created_at: '2026-03-21T00:00:00.000Z',
    goes_to_kitchen: true,
  },
]

describe('category page helpers', () => {
  it('retorna valores default e valores de categoria para formulario', () => {
    expect(getDefaultCategoryFormValues()).toEqual({
      name: '',
      display_order: 0,
      goes_to_kitchen: true,
    })

    expect(getCategoryFormValues(null)).toEqual(getDefaultCategoryFormValues())
    expect(getCategoryFormValues(categories[0])).toEqual({
      name: 'Bebidas',
      display_order: 2,
      goes_to_kitchen: false,
    })
  })

  it('filtra categorias por destino e nome', () => {
    expect(filterCategories(categories, 'all', '')).toHaveLength(3)
    expect(filterCategories(categories, 'kitchen', '')).toEqual([categories[1], categories[2]])
    expect(filterCategories(categories, 'counter', '')).toEqual([categories[0]])
    expect(filterCategories(categories, 'all', ' piz ')).toEqual([categories[1]])
  })

  it('paginar categorias e calcular total de paginas', () => {
    expect(paginateCategories(categories, 1, 2)).toEqual([categories[0], categories[1]])
    expect(paginateCategories(categories, 2, 2)).toEqual([categories[2]])
    expect(paginateCategories(categories, 0, 2)).toEqual([categories[0], categories[1]])
    expect(getCategoryTotalPages(0, 10)).toBe(1)
    expect(getCategoryTotalPages(21, 10)).toBe(3)
  })

  it('calcula estado e texto de limite do plano', () => {
    expect(isCategoryLimitReached(undefined, true)).toBe(false)
    expect(isCategoryLimitReached({ resource_limits: { categories: 3 } }, false)).toBe(true)
    expect(getCategoryPlanUsageText(undefined, 2)).toBe('')
    expect(getCategoryPlanUsageText({ resource_limits: { categories: -1 } }, 2)).toBe('')
    expect(getCategoryPlanUsageText({ resource_limits: { categories: 5 } }, 2)).toBe(' · 2/5 no plano')
  })
})
