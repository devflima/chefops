import { Input } from '@/components/ui/input'
import { formatCustomerCpf, formatCustomerPhone, getCustomerLastAddressLabel, getCustomersSummary, isCustomerProfileComplete, type CustomersFilter } from '@/features/customers/customers-page'
import type { Customer } from '@/features/customers/hooks/useCustomers'
import { Users } from 'lucide-react'

type Props = {
  customers: Customer[]
  isLoading: boolean
  search: string
  onSearchChange: (value: string) => void
  filter: CustomersFilter
  totalCustomers: number
  onFilterChange: (value: CustomersFilter) => void
  onClearFilters: () => void
}

export function CustomersPageContent({ customers, isLoading, search, onSearchChange, filter, totalCustomers, onFilterChange, onClearFilters }: Props) {
  const summary = getCustomersSummary(customers)
  const isFiltered = search.trim().length > 0 || filter !== 'all'
  const emptyStateMessage = isFiltered
    ? 'Nenhum cliente encontrado para o filtro atual.'
    : 'Nenhum cliente cadastrado.'
  const activeFilterLabels: Record<CustomersFilter, string | null> = {
    all: null,
    with_cpf: 'Com CPF',
    without_cpf: 'Sem CPF',
    with_address: 'Com endereço',
    without_address: 'Sem endereço',
    complete: 'Cadastros completos',
    incomplete: 'Cadastros incompletos',
  }
  const activeFilterLabel = activeFilterLabels[filter]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clientes do estabelecimento</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulte os clientes identificados nas jornadas públicas e presenciais.
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Total de clientes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Ver todos
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Com CPF</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.withCpf}</p>
          <button
            type="button"
            onClick={() => onFilterChange('with_cpf')}
            className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Ver com CPF
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Sem CPF</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.withoutCpf}</p>
          <button
            type="button"
            onClick={() => onFilterChange('without_cpf')}
            className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Ver sem CPF
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Com endereço</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.withAddress}</p>
          <button
            type="button"
            onClick={() => onFilterChange('with_address')}
            className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Ver com endereço
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Sem endereço</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.withoutAddress}</p>
          <button
            type="button"
            onClick={() => onFilterChange('without_address')}
            className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Ver sem endereço
          </button>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">Cadastros completos</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{summary.complete}</p>
          <button
            type="button"
            onClick={() => onFilterChange('complete')}
            className="mt-3 text-sm font-medium text-emerald-800 underline underline-offset-4"
          >
            Ver completos
          </button>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-700">Cadastros incompletos</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{summary.incomplete}</p>
          <button
            type="button"
            onClick={() => onFilterChange('incomplete')}
            className="mt-3 text-sm font-medium text-amber-800 underline underline-offset-4"
          >
            Ver incompletos
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">{customers.length} de {totalCustomers} clientes</p>
              {activeFilterLabel ? (
                <p className="mt-1 text-xs font-medium text-slate-500">Filtro: {activeFilterLabel}</p>
              ) : null}
            </div>
            {isFiltered ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Filtrar por nome ou telefone..."
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="max-w-sm bg-white"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'with_cpf', label: 'Com CPF' },
                { value: 'without_cpf', label: 'Sem CPF' },
                { value: 'with_address', label: 'Com endereço' },
                { value: 'without_address', label: 'Sem endereço' },
                { value: 'complete', label: 'Cadastros completos' },
                { value: 'incomplete', label: 'Cadastros incompletos' },
              ].map((option) => {
                const active = filter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onFilterChange(option.value as CustomersFilter)}
                    className={active
                      ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white'
                      : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600'}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">Carregando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">{emptyStateMessage}</p>
            {isFiltered ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Cliente', 'Telefone', 'Documento', 'Último endereço', 'Criado em'].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => {
                return (
                  <tr key={customer.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{customer.name}</span>
                        {isCustomerProfileComplete(customer) ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Completo</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Incompleto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatCustomerPhone(customer.phone)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCustomerCpf(customer.cpf)}</td>
                    <td className="px-4 py-3 text-slate-600">{getCustomerLastAddressLabel(customer.addresses)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
