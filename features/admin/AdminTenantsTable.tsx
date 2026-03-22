import Link from 'next/link'
import PaginationControls from '@/components/shared/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import {
  formatCurrency,
  formatDate,
  getAdminTenantTableHeaders,
  isUpgradeCandidate,
  planConfig,
  statusConfig,
  type AdminTenant,
} from '@/features/admin/admin-tenants-page'

export function AdminTenantsTable({
  loading,
  filtered,
  paginated,
  page,
  totalPages,
  onPageChange,
  onManage,
}: {
  loading: boolean
  filtered: AdminTenant[]
  paginated: AdminTenant[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onManage: (tenant: AdminTenant) => void
}) {
  const tableHeaders = getAdminTenantTableHeaders()

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="p-12 text-center text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Nenhum estabelecimento encontrado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {tableHeaders.map((header) => (
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
                {paginated.map((tenant) => (
                  <tr key={tenant.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 font-semibold text-slate-600">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-slate-400">{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${planConfig[tenant.plan].color}`}>
                        {planConfig[tenant.plan].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusConfig[tenant.status].color}`}>
                        {statusConfig[tenant.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-slate-700">{tenant.total_orders} pedidos</p>
                        <p className="text-xs text-slate-400">{tenant.total_users} usuários</p>
                        {isUpgradeCandidate(tenant) && (
                          <Badge className="mt-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                            Potencial de upgrade
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(tenant.total_revenue ?? 0))}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(tenant.last_order_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(tenant.next_billing_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onManage(tenant)}>
                          Gerenciar
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/tenants/${tenant.id}`}>Detalhes</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </>
      )}
    </div>
  )
}
