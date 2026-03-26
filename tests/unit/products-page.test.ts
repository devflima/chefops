import { describe, expect, it } from 'vitest'

import {
  getDefaultProductFormValues,
  getProductActiveFilter,
  getProductCategoryFilterValue,
  getProductFormValues,
  getProductsPlanUsageText,
  getProductsTotalPages,
  isProductLimitReached,
  unitLabels,
} from '@/features/products/products-page'

const product = {
  id: '1',
  tenant_id: 'tenant-1',
  category_id: 'cat-1',
  name: 'Farinha',
  sku: 'FR-01',
  unit: 'kg' as const,
  cost_price: 12.5,
  min_stock: 3,
  active: true,
  created_at: '2026-03-21T00:00:00.000Z',
  updated_at: '2026-03-21T00:00:00.000Z',
}

describe('products page helpers', () => {
  it('retorna valores default e valores do formulario', () => {
    expect(getDefaultProductFormValues()).toEqual({
      name: '',
      sku: '',
      unit: 'un',
      cost_price: 0,
      min_stock: 0,
    })

    expect(getProductFormValues(null)).toEqual(getDefaultProductFormValues())
    expect(getProductFormValues(product)).toEqual({
      name: 'Farinha',
      sku: 'FR-01',
      category_id: 'cat-1',
      unit: 'kg',
      cost_price: 12.5,
      min_stock: 3,
    })

    expect(
      getProductFormValues({
        ...product,
        sku: null as unknown as string,
        category_id: null as unknown as string,
      }),
    ).toEqual({
      name: 'Farinha',
      sku: '',
      category_id: '',
      unit: 'kg',
      cost_price: 12.5,
      min_stock: 3,
    })
  })

  it('calcula filtros usados pela pagina', () => {
    expect(getProductCategoryFilterValue('all')).toBeUndefined()
    expect(getProductCategoryFilterValue('cat-1')).toBe('cat-1')
    expect(getProductActiveFilter('all')).toBeUndefined()
    expect(getProductActiveFilter('active')).toBe(true)
    expect(getProductActiveFilter('inactive')).toBe(false)
  })

  it('calcula texto e estado de limite do plano', () => {
    expect(isProductLimitReached(undefined, true)).toBe(false)
    expect(isProductLimitReached({ max_products: 3 }, false)).toBe(true)
    expect(getProductsPlanUsageText(undefined, 1)).toBe('')
    expect(getProductsPlanUsageText({}, 1)).toBe('')
    expect(getProductsPlanUsageText({ max_products: -1 }, 1)).toBe('')
    expect(getProductsPlanUsageText({ max_products: 10 }, 4)).toBe(' · 4/10 no plano')
  })

  it('calcula total de paginas e expoe labels de unidade', () => {
    expect(getProductsTotalPages(0, 10)).toBe(1)
    expect(getProductsTotalPages(21, 10)).toBe(3)
    expect(unitLabels.kg).toBe('Kg')
    expect(unitLabels.pct).toBe('Pacote')
  })
})
