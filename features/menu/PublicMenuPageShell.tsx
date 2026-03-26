import type { CartItem } from '@/features/orders/types'
import type {
  MenuExtra,
  PublicMenuItem,
  PublicOrderStatus,
} from '@/features/menu/public-menu'

import { HalfFlavorModal } from '@/features/menu/HalfFlavorModal'
import { MenuCategoryFilter } from '@/features/menu/MenuCategoryFilter'
import { MenuTopBar } from '@/features/menu/MenuTopBar'
import { MenuStatusPanel } from '@/features/menu/MenuStatusPanel'
import { PublicMenuSections } from '@/features/menu/PublicMenuSections'
import { MenuCheckoutDrawer } from '@/features/menu/MenuCheckoutDrawer'

type Props = {
  tenantName: string
  tableInfo: { id: string; number: string } | null
  cartCount: number
  onCartOpen: () => void
  checkoutNotice: string | null
  publicOrderStatus: PublicOrderStatus | null
  cartOpen: boolean
  headline: string | null
  onTrackOrder: () => void
  groups: ReturnType<typeof import('@/features/menu/public-menu').groupMenuItems>
  activeCategory: string | null
  onCategoryChange: (value: string | null) => void
  items: PublicMenuItem[]
  filteredGroups: ReturnType<typeof import('@/features/menu/public-menu').filterGroupsByCategory>
  selectedBorders: Record<string, MenuExtra | null>
  onAdd: (item: PublicMenuItem, halfFlavor?: PublicMenuItem) => void
  onBorderToggle: (item: PublicMenuItem, border: MenuExtra | null) => void
  onHalfFlavor: (item: PublicMenuItem) => void
  halfFlavorModal: { item: PublicMenuItem } | null
  halfFlavorOptions: PublicMenuItem[]
  onCloseHalfFlavor: () => void
  onSelectHalfFlavor: (item: PublicMenuItem) => void
  drawerProps: React.ComponentProps<typeof MenuCheckoutDrawer>
}

export function PublicMenuPageShell({
  tenantName,
  tableInfo,
  cartCount,
  onCartOpen,
  checkoutNotice,
  publicOrderStatus,
  cartOpen,
  headline,
  onTrackOrder,
  groups,
  activeCategory,
  onCategoryChange,
  items,
  filteredGroups,
  selectedBorders,
  onAdd,
  onBorderToggle,
  onHalfFlavor,
  halfFlavorModal,
  halfFlavorOptions,
  onCloseHalfFlavor,
  onSelectHalfFlavor,
  drawerProps,
}: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <MenuTopBar
        tenantName={tenantName}
        tableInfo={tableInfo}
        cartCount={cartCount}
        onCartOpen={onCartOpen}
      />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <MenuStatusPanel
          checkoutNotice={checkoutNotice}
          publicOrderStatus={publicOrderStatus}
          cartOpen={cartOpen}
          headline={headline}
          onTrackOrder={onTrackOrder}
          tableInfo={tableInfo}
        />

        <MenuCategoryFilter
          groups={groups}
          activeCategory={activeCategory}
          onChange={onCategoryChange}
        />

        <PublicMenuSections
          items={items}
          filteredGroups={filteredGroups}
          selectedBorders={selectedBorders}
          onAdd={onAdd}
          onBorderToggle={onBorderToggle}
          onHalfFlavor={onHalfFlavor}
        />
      </main>

      {halfFlavorModal && (
        <HalfFlavorModal
          item={halfFlavorModal.item}
          options={halfFlavorOptions}
          onClose={onCloseHalfFlavor}
          onSelect={onSelectHalfFlavor}
        />
      )}

      <MenuCheckoutDrawer {...drawerProps} />
    </div>
  )
}
