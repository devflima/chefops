'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PaginationControls from '@/components/shared/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, CreditCard, Search, TrendingUp } from 'lucide-react'

type AdminTenant = {
  id: string
  name: string
  slug: string
  plan: 'free' | 'basic' | 'pro'
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  suspended_at: string | null
  suspension_reason: string | null
  next_billing_at: string | null
  total_users: number
  total_orders: number
  total_revenue: number
  last_order_at: string | null
}

const statusConfig = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inativo', color: 'bg-slate-100 text-slate-600' },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-700' },
}

const planConfig = {
  free: { label: 'Basic', color: 'bg-slate-100 text-slate-600' },
  basic: { label: 'Standard', color: 'bg-blue-100 text-blue-700' },
  pro: { label: 'Premium', color: 'bg-purple-100 text-purple-700' },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function isUpgradeCandidate(tenant: AdminTenant) {
  return tenant.plan === 'free' && (
    tenant.total_orders >= 15 ||
    Number(tenant.total_revenue ?? 0) >= 500 ||
    tenant.total_users >= 2
  )
}

const PAGE_SIZE = 10

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'basic' | 'pro'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all')
  const [selected, setSelected] = useState<AdminTenant | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [newPlan, setNewPlan] = useState<'free' | 'basic' | 'pro'>('free')
  const [newBillingDate, setNewBillingDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  async function loadTenants() {
    setLoading(true)
    const res = await fetch('/api/admin/tenants')
    const json = await res.json()
    setTenants(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadTenants()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, planFilter, statusFilter])

  function openTenant(tenant: AdminTenant) {
    setSelected(tenant)
    setNewPlan(tenant.plan)
    setSuspendReason(tenant.suspension_reason ?? '')
    setNewBillingDate(
      tenant.next_billing_at
        ? new Date(tenant.next_billing_at).toISOString().split('T')[0]
        : ''
    )
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      await fetch(`/api/admin/tenants/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: newPlan,
          next_billing_at: newBillingDate
            ? new Date(newBillingDate).toISOString()
            : undefined,
        }),
      })
      await loadTenants()
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleSuspend() {
    if (!selected) return
    const reason = suspendReason.trim() || 'Inadimplência'
    setSaving(true)
    try {
      await fetch(`/api/admin/tenants/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'suspended',
          suspension_reason: reason,
        }),
      })
      await loadTenants()
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleReactivate() {
    if (!selected) return
    setSaving(true)
    try {
      await fetch(`/api/admin/tenants/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      await loadTenants()
      setSelected(null)
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(search.toLowerCase()) ||
        tenant.slug.toLowerCase().includes(search.toLowerCase())
      const matchesPlan = planFilter === 'all' || tenant.plan === planFilter
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter
      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [tenants, search, planFilter, statusFilter])

  const stats = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.status === 'active').length
    const suspended = tenants.filter((tenant) => tenant.status === 'suspended').length
    const upgradeCandidates = tenants.filter(isUpgradeCandidate).length
    const monthlyRevenue = tenants.reduce((sum, tenant) => {
      if (tenant.plan === 'basic') return sum + 89
      if (tenant.plan === 'pro') return sum + 189
      return sum
    }, 0)

    return { active, suspended, upgradeCandidates, monthlyRevenue }
  }, [tenants])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estabelecimentos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Operação comercial, suporte e oportunidade de upgrade em um só lugar.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Base total</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{tenants.length}</p>
          <p className="mt-2 text-xs text-slate-400">{stats.active} ativos</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Suspensos</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{stats.suspended}</p>
          <p className="mt-2 text-xs text-slate-400">Clientes com ação pendente</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Prontos para upgrade</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{stats.upgradeCandidates}</p>
          <p className="mt-2 text-xs text-slate-400">Basic com uso acima da média</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">MRR estimado</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{formatCurrency(stats.monthlyRevenue)}</p>
          <p className="mt-2 text-xs text-slate-400">Baseado em Standard e Premium</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou slug..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={planFilter} onValueChange={(value) => setPlanFilter(value as typeof planFilter)}>
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

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
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
          <span>{filtered.length} encontrados</span>
          <span>•</span>
          <span>{tenants.filter((tenant) => tenant.plan === 'free').length} no Basic</span>
          <span>•</span>
          <span>{tenants.filter((tenant) => tenant.plan !== 'free').length} pagantes</span>
        </div>
      </div>

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
                    {['Estabelecimento', 'Plano', 'Status', 'Uso', 'Receita', 'Última atividade', 'Próx. cobrança', ''].map((header) => (
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
                      <td className="px-4 py-3 text-slate-700">
                        {formatCurrency(Number(tenant.total_revenue ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(tenant.last_order_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(tenant.next_billing_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openTenant(tenant)}>
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

            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">Slug</p>
                  <p className="font-medium">{selected.slug}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">Cadastrado em</p>
                  <p className="font-medium">{formatDate(selected.created_at)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">Pedidos</p>
                  <p className="font-medium">{selected.total_orders}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">Receita total</p>
                  <p className="font-medium">{formatCurrency(Number(selected.total_revenue ?? 0))}</p>
                </div>
              </div>

              {selected.status === 'suspended' && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="mb-1 text-xs font-medium text-red-700">Motivo da suspensão</p>
                  <p className="text-sm text-red-600">{selected.suspension_reason}</p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Plano</label>
                <Select value={newPlan} onValueChange={(value) => setNewPlan(value as typeof newPlan)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Basic</SelectItem>
                    <SelectItem value="basic">Standard — R$ 89/mês</SelectItem>
                    <SelectItem value="pro">Premium — R$ 189/mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Próxima cobrança
                </label>
                <Input
                  type="date"
                  value={newBillingDate}
                  onChange={(e) => setNewBillingDate(e.target.value)}
                />
              </div>

              {selected.status !== 'suspended' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Motivo da suspensão
                  </label>
                  <Input
                    placeholder="Ex: Inadimplência — fatura vencida há 7 dias"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </Button>

                {selected.status === 'suspended' ? (
                  <Button
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    onClick={handleReactivate}
                    disabled={saving}
                  >
                    Reativar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleSuspend}
                    disabled={saving || !suspendReason.trim()}
                  >
                    Suspender
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
