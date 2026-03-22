import { describe, expect, it } from 'vitest'

import {
  filterStockBalance,
  filterStockMovements,
  getLowStockItems,
  getStockCategories,
  getStockTotalPages,
  paginateStockItems,
} from '@/features/stock/stock-page'

const balance = [
  {
    product_id: '1',
    product_name: 'Farinha',
    category_name: 'Secos',
    current_stock: 2,
    min_stock: 5,
    unit: 'kg',
    is_low_stock: true,
  },
  {
    product_id: '2',
    product_name: 'Tomate',
    category_name: 'Hortifruti',
    current_stock: 10,
    min_stock: 3,
    unit: 'kg',
    is_low_stock: false,
  },
  {
    product_id: '3',
    product_name: 'Agua',
    category_name: null,
    current_stock: 20,
    min_stock: 2,
    unit: 'un',
    is_low_stock: false,
  },
]

const movements = [
  {
    id: '1',
    created_at: '2026-03-21T10:00:00.000Z',
    product: { name: 'Farinha', unit: 'kg' },
    type: 'entry',
    quantity: 5,
    reason: 'Compra',
  },
  {
    id: '2',
    created_at: '2026-03-21T11:00:00.000Z',
    product: { name: 'Tomate', unit: 'kg' },
    type: 'loss',
    quantity: 1,
    reason: 'Perda',
  },
]

describe('stock page helpers', () => {
  it('lista categorias unicas e itens com estoque baixo', () => {
    expect(getStockCategories(balance as never)).toEqual(['Secos', 'Hortifruti'])
    expect(getLowStockItems(balance as never)).toEqual([balance[0]])
  })

  it('filtra saldo por categoria e status', () => {
    expect(filterStockBalance(balance as never, 'all', 'all')).toHaveLength(3)
    expect(filterStockBalance(balance as never, 'Secos', 'all')).toEqual([balance[0]])
    expect(filterStockBalance(balance as never, 'all', 'low')).toEqual([balance[0]])
    expect(filterStockBalance(balance as never, 'all', 'ok')).toEqual([balance[1], balance[2]])
  })

  it('filtra movimentos e pagina listas', () => {
    expect(filterStockMovements(movements, 'all')).toEqual(movements)
    expect(filterStockMovements(movements, 'loss')).toEqual([movements[1]])
    expect(paginateStockItems(movements, 1, 1)).toEqual([movements[0]])
    expect(paginateStockItems(movements, 2, 1)).toEqual([movements[1]])
    expect(getStockTotalPages(0, 10)).toBe(1)
    expect(getStockTotalPages(21, 10)).toBe(3)
  })
})
