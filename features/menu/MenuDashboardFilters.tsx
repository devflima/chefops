export function MenuDashboardFilters({
  categoryFilter,
  onCategoryFilterChange,
  categories,
  statusFilter,
  onStatusFilterChange,
}: {
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  categories?: Array<{ id: string; name: string }>
  statusFilter: 'all' | 'available' | 'inactive'
  onStatusFilterChange: (value: 'all' | 'available' | 'inactive') => void
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <select
        value={categoryFilter}
        onChange={(event) => onCategoryFilterChange(event.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
      >
        <option value="all">Todas as categorias</option>
        {categories?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value as 'all' | 'available' | 'inactive')}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
      >
        <option value="all">Todos os status</option>
        <option value="available">Somente disponíveis</option>
        <option value="inactive">Somente inativos</option>
      </select>
    </div>
  )
}
