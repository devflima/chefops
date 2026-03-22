import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type {
  AdminTenantFilterSummary,
  AdminTenantPlanFilter,
  AdminTenantStatusFilter,
} from '@/features/admin/admin-tenants-page'

type Props = {
  search: string
  planFilter: AdminTenantPlanFilter
  statusFilter: AdminTenantStatusFilter
  filterSummary: AdminTenantFilterSummary
  onSearchChange: (value: string) => void
  onPlanFilterChange: (value: AdminTenantPlanFilter) => void
  onStatusFilterChange: (value: AdminTenantStatusFilter) => void
}

export function AdminTenantsFilters({
  search,
  planFilter,
  statusFilter,
  filterSummary,
  onSearchChange,
  onPlanFilterChange,
  onStatusFilterChange,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou slug..."
            className="pl-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <Select value={planFilter} onValueChange={(value) => onPlanFilterChange(value as AdminTenantPlanFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="free">Basic</SelectItem>
            <SelectItem value="basic">Standard</SelectItem>
            <SelectItem value="pro">Premium</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as AdminTenantStatusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>{filterSummary.filteredCount} encontrados</span>
        <span>•</span>
        <span>{filterSummary.freeCount} no Basic</span>
        <span>•</span>
        <span>{filterSummary.paidCount} pagantes</span>
      </div>
    </div>
  )
}
