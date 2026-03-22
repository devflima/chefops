import type { StockBalance } from '@/features/stock/types'

export type BalanceStatusFilter = 'all' | 'low' | 'ok'
export type StockTab = 'balance' | 'movements'

export type StockMovementView = {
  id: string
  created_at: string
  product: { name: string; unit: string }
  type: string
  quantity: number
  reason: string | null
}

export function getStockCategories(balance: StockBalance[]) {
  return Array.from(
    new Map<string, string>(
      balance
        .filter(
          (item): item is StockBalance & { category_name: string } =>
            typeof item.category_name === 'string' && item.category_name.length > 0,
        )
        .map((item) => [item.category_name, item.category_name] as const),
    ).values(),
  )
}

export function getLowStockItems(balance: StockBalance[]) {
  return balance.filter((item) => item.is_low_stock)
}

export function filterStockBalance(
  balance: StockBalance[],
  categoryFilter: string,
  balanceStatusFilter: BalanceStatusFilter,
) {
  return balance.filter((item) => {
    if (categoryFilter !== 'all' && item.category_name !== categoryFilter) return false
    if (balanceStatusFilter === 'low') return item.is_low_stock
    if (balanceStatusFilter === 'ok') return !item.is_low_stock
    return true
  })
}

export function filterStockMovements(movements: StockMovementView[], movementTypeFilter: string) {
  return movements.filter((movement) =>
    movementTypeFilter === 'all' ? true : movement.type === movementTypeFilter,
  )
}

export function paginateStockItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, page)
  return items.slice((safePage - 1) * pageSize, safePage * pageSize)
}

export function getStockTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}
