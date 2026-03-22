import PaginationControls from '@/components/shared/PaginationControls'

import type { MenuItem } from '@/features/orders/types'

import { MenuDashboardHeader } from '@/features/menu/MenuDashboardHeader'
import { MenuDashboardFilters } from '@/features/menu/MenuDashboardFilters'
import { MenuDashboardEmptyState } from '@/features/menu/MenuDashboardEmptyState'
import { MenuDashboardTable } from '@/features/menu/MenuDashboardTable'
import { MenuItemDialog } from '@/features/menu/MenuItemDialog'
import type { MenuItemIngredient } from '@/features/menu/dashboard-menu-page'

type Props = {
  availableCount: number
  inactiveCount: number
  limitLabel: string
  menuItemLimitReached: boolean
  onCreate: () => void
  planName?: string
  menuItemLimit?: number
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  categories?: Array<{ id: string; name: string }>
  statusFilter: 'all' | 'available' | 'inactive'
  onStatusFilterChange: (value: 'all' | 'available' | 'inactive') => void
  isLoading: boolean
  items: MenuItem[]
  paginatedItems: MenuItem[]
  deletingId: string | null
  onEdit: (item: MenuItem) => void | Promise<void>
  onToggleAvailable: (item: MenuItem) => void | Promise<void>
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  dialogProps: React.ComponentProps<typeof MenuItemDialog>
}

export function MenuDashboardPageContent({
  availableCount,
  inactiveCount,
  limitLabel,
  menuItemLimitReached,
  onCreate,
  planName,
  menuItemLimit,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  statusFilter,
  onStatusFilterChange,
  isLoading,
  items,
  paginatedItems,
  deletingId,
  onEdit,
  onToggleAvailable,
  page,
  totalPages,
  onPageChange,
  dialogProps,
}: Props) {
  return (
    <div>
      <MenuDashboardHeader
        availableCount={availableCount}
        inactiveCount={inactiveCount}
        limitLabel={limitLabel}
        menuItemLimitReached={menuItemLimitReached}
        onCreate={onCreate}
      />

      {planName === 'free' && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          No plano Basic, o estabelecimento pode receber até 50 pedidos online por mês.
          {menuItemLimitReached && (
            <span className="mt-2 block text-amber-800">
              O limite de {menuItemLimit} itens de cardápio do plano também foi atingido.
            </span>
          )}
        </div>
      )}

      <MenuDashboardFilters
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        categories={categories}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : items.length === 0 ? (
          <MenuDashboardEmptyState
            menuItemLimitReached={menuItemLimitReached}
            onCreate={onCreate}
          />
        ) : (
          <MenuDashboardTable
            items={paginatedItems}
            deletingId={deletingId}
            onEdit={onEdit}
            onToggleAvailable={onToggleAvailable}
          />
        )}
      </div>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <MenuItemDialog {...dialogProps} />
    </div>
  )
}
