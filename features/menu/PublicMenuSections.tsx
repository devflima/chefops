import { MenuEmptyState } from '@/features/menu/MenuEmptyState'
import { MenuItemCard } from '@/features/menu/MenuItemCard'
import type { MenuExtra, PublicMenuItem } from '@/features/menu/public-menu'

type MenuGroup = {
  category: { id: string; name: string } | null
  items: PublicMenuItem[]
}

export function PublicMenuSections({
  items,
  filteredGroups,
  selectedBorders,
  selectedExtras = {},
  onAdd,
  onBorderToggle,
  onExtraToggle = () => {},
  onHalfFlavor,
  menuDisabled = false,
}: {
  items: PublicMenuItem[]
  filteredGroups: MenuGroup[]
  selectedBorders: Record<string, MenuExtra | null>
  selectedExtras?: Record<string, MenuExtra[]>
  onAdd: (item: PublicMenuItem) => void
  onBorderToggle: (item: PublicMenuItem, border: MenuExtra | null) => void
  onExtraToggle?: (item: PublicMenuItem, extra: MenuExtra) => void
  onHalfFlavor: (item: PublicMenuItem) => void
  menuDisabled?: boolean
}) {
  if (items.length === 0) {
    return <MenuEmptyState />
  }

  return (
    <>
      {filteredGroups.map(({ category, items: groupItems }) => (
        <div key={category?.id ?? 'outros'} className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            {category?.name ?? 'Outros'}
          </h2>
          <div className="space-y-3">
            {groupItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                selectedBorder={selectedBorders[item.id]}
                selectedExtras={selectedExtras[item.id] ?? []}
                onAdd={() => onAdd(item)}
                onBorderToggle={(border) => onBorderToggle(item, border)}
                onExtraToggle={(extra) => onExtraToggle(item, extra)}
                onHalfFlavor={() => onHalfFlavor(item)}
                disabled={menuDisabled}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
