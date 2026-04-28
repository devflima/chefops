import { describe, expect, it } from 'vitest'

import {
  filterExtras,
  getDefaultExtraFormValues,
  getExtraFormValues,
  getExtrasPlanUsageText,
  getExtrasTotalPages,
  isExtrasLimitReached,
  paginateExtras,
} from '@/features/products/extras-page'

const extras = [
  {
    id: '1',
    name: 'Borda de catupiry',
    price: 8,
    category: 'border' as const,
    active: true,
  },
  {
    id: '2',
    name: 'Cheddar extra',
    price: 4,
    category: 'other' as const,
    active: true,
  },
  {
    id: '3',
    name: 'Sabor meio a meio',
    price: 0,
    category: 'flavor' as const,
    active: true,
  },
]

describe('extras page helpers', () => {
  it('retorna valores default e valores do formulario', () => {
    expect(getDefaultExtraFormValues()).toEqual({
      name: '',
      price: 0,
      category: 'other',
      target_categories: [],
    })

    expect(getExtraFormValues(null)).toEqual(getDefaultExtraFormValues())
    expect(getExtraFormValues(extras[0])).toEqual({
      name: 'Borda de catupiry',
      price: 8,
      category: 'border',
      target_categories: [],
    })
  })

  it('filtra extras por categoria e nome', () => {
    expect(filterExtras(extras, 'all', '')).toHaveLength(3)
    expect(filterExtras(extras, 'border', '')).toEqual([extras[0]])
    expect(filterExtras(extras, 'flavor', '')).toEqual([extras[2]])
    expect(filterExtras(extras, 'all', 'cheddar')).toEqual([extras[1]])
  })

  it('pagina extras e calcula total de paginas', () => {
    expect(paginateExtras(extras, 1, 2)).toEqual([extras[0], extras[1]])
    expect(paginateExtras(extras, 2, 2)).toEqual([extras[2]])
    expect(getExtrasTotalPages(0, 10)).toBe(1)
    expect(getExtrasTotalPages(21, 10)).toBe(3)
  })

  it('calcula estado e texto do limite de extras', () => {
    expect(isExtrasLimitReached(undefined, true)).toBe(false)
    expect(isExtrasLimitReached({ resource_limits: { extras: 2 } }, false)).toBe(true)
    expect(getExtrasPlanUsageText(undefined, 1)).toBe('')
    expect(getExtrasPlanUsageText({ resource_limits: { extras: -1 } }, 1)).toBe('')
    expect(getExtrasPlanUsageText({ resource_limits: { extras: 5 } }, 3)).toBe(' · 3/5 no plano')
  })
})
