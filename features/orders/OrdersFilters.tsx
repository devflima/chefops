export function OrdersFilters({
  filters,
  statusFilter,
  onChange,
}: {
  filters: Array<{ label: string; value: string }>
  statusFilter: string
  onChange: (value: string) => void
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            statusFilter === filter.value
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
