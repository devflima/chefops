'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Building2, Search } from 'lucide-react'

type AdminTenant = {
  id: string
  name: string
  slug: string
  plan: string
  status: string
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
  active:    { label: 'Ativo',     color: 'bg-green-100 text-green-700' },
  inactive:  { label: 'Inativo',   color: 'bg-slate-100 text-slate-600' },
  suspended: { label: 'Suspenso',  color: 'bg-red-100 text-red-700' },
}

const planConfig = {
  free:  { label: 'Free',  color: 'bg-slate-100 text-slate-600' },
  basic: { label: 'Basic', color: 'bg-blue-100 text-blue-700' },
  pro:   { label: 'Pro',   color: 'bg-purple-100 text-purple-700' },
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminTenant | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [newPlan, setNewPlan] = useState('')
  const [newBillingDate, setNewBillingDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadTenants() {
    setLoading(true)
    const res = await fetch('/api/admin/tenants')
    const json = await res.json()
    setTenants(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTenants() }, [])

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

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estabelecimentos</h1>
          <p className="text-slate-500 text-sm mt-1">{tenants.length} cadastrados</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome ou slug..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum estabelecimento encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Estabelecimento', 'Plano', 'Status', 'Usuários', 'Pedidos', 'Receita', 'Próx. cobrança', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{tenant.name}</p>
                    <p className="text-xs text-slate-400">{tenant.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${planConfig[tenant.plan as keyof typeof planConfig]?.color}`}>
                      {planConfig[tenant.plan as keyof typeof planConfig]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[tenant.status as keyof typeof statusConfig]?.color}`}>
                      {statusConfig[tenant.status as keyof typeof statusConfig]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tenant.total_users}</td>
                  <td className="px-4 py-3 text-slate-600">{tenant.total_orders}</td>
                  <td className="px-4 py-3 text-slate-600">
                    R$ {Number(tenant.total_revenue).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {tenant.next_billing_at
                      ? new Date(tenant.next_billing_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => openTenant(tenant)}>
                      Gerenciar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de gerenciamento */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-1">Slug</p>
                  <p className="font-medium">{selected.slug}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-1">Cadastrado em</p>
                  <p className="font-medium">
                    {new Date(selected.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-1">Pedidos</p>
                  <p className="font-medium">{selected.total_orders}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-1">Receita total</p>
                  <p className="font-medium">R$ {Number(selected.total_revenue).toFixed(2)}</p>
                </div>
              </div>

              {selected.status === 'suspended' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">Motivo da suspensão</p>
                  <p className="text-sm text-red-600">{selected.suspension_reason}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Plano</label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic — R$ 89/mês</SelectItem>
                    <SelectItem value="pro">Pro — R$ 189/mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
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
                  <label className="text-sm font-medium text-slate-700 block mb-1">
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
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving}
                >
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