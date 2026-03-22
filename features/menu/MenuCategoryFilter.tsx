import type { MenuCategory, PublicMenuItem } from '@/features/menu/public-menu'

export function MenuCategoryFilter({
  groups,
  activeCategory,
  onChange,
}: {
  groups: Array<{ category: MenuCategory | null; items: PublicMenuItem[] }>
  activeCategory: string | null
  onChange: (value: string | null) => void
}) {
  if (groups.length <= 1) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${!activeCategory ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        Todos
      </button>
      {groups.map(({ category }) => (
        <button
          key={category?.id ?? 'outros'}
          onClick={() => onChange(category?.id ?? 'outros')}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCategory === (category?.id ?? 'outros') ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          {category?.name ?? 'Outros'}
        </button>
      ))}
    </div>
  )
}
