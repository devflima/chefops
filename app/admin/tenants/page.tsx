'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  buildAdminTenantFilterSummary,
  buildAdminTenantCards,
  getAdminTenantCloseState,
  getAdminTenantOpenState,
  getAdminTenantPageReset,
  getAdminTenantSavedState,
  getAdminTenantSavingState,
  loadAdminTenants,
  buildAdminTenantStats,
  reactivateAdminTenant,
  filterAdminTenants,
  paginateAdminTenants,
  saveAdminTenantChanges,
  suspendAdminTenant,
  type AdminTenant,
} from '@/features/admin/admin-tenants-page'
import { AdminTenantsTable } from '@/features/admin/AdminTenantsTable'
import { AdminTenantManagementDialog } from '@/features/admin/AdminTenantManagementDialog'
import { AdminTenantsStats } from '@/features/admin/AdminTenantsStats'
import { AdminTenantsFilters } from '@/features/admin/AdminTenantsFilters'

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
    setTenants(await loadAdminTenants())
    setLoading(false)
  }

  useEffect(() => {
    loadTenants()
  }, [])

  useEffect(() => {
    setPage(getAdminTenantPageReset())
  }, [search, planFilter, statusFilter])

  function openTenant(tenant: AdminTenant) {
    const dialogState = getAdminTenantOpenState(tenant)
    setSelected(dialogState.selected)
    setNewPlan(dialogState.newPlan)
    setSuspendReason(dialogState.suspendReason)
    setNewBillingDate(dialogState.newBillingDate)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(getAdminTenantSavingState())
    try {
      await saveAdminTenantChanges(selected.id, newPlan, newBillingDate)
      await loadTenants()
      setSelected(getAdminTenantSavedState().selected)
    } finally {
      setSaving(getAdminTenantSavedState().saving)
    }
  }

  async function handleSuspend() {
    if (!selected) return
    setSaving(getAdminTenantSavingState())
    try {
      await suspendAdminTenant(selected.id, suspendReason)
      await loadTenants()
      setSelected(getAdminTenantSavedState().selected)
    } finally {
      setSaving(getAdminTenantSavedState().saving)
    }
  }

  async function handleReactivate() {
    if (!selected) return
    setSaving(getAdminTenantSavingState())
    try {
      await reactivateAdminTenant(selected.id)
      await loadTenants()
      setSelected(getAdminTenantSavedState().selected)
    } finally {
      setSaving(getAdminTenantSavedState().saving)
    }
  }

  const filtered = useMemo(() => {
    return filterAdminTenants(tenants, search, planFilter, statusFilter)
  }, [tenants, search, planFilter, statusFilter])

  const stats = useMemo(() => {
    return buildAdminTenantStats(tenants)
  }, [tenants])

  const { totalPages, paginated } = useMemo(
    () => paginateAdminTenants(filtered, page, PAGE_SIZE),
    [filtered, page]
  )
  const filterSummary = useMemo(
    () => buildAdminTenantFilterSummary(tenants, filtered),
    [tenants, filtered]
  )
  const statCards = useMemo(() => buildAdminTenantCards(stats, tenants.length), [stats, tenants.length])
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

      <AdminTenantsStats cards={statCards} />

      <AdminTenantsFilters
        search={search}
        planFilter={planFilter}
        statusFilter={statusFilter}
        filterSummary={filterSummary}
        onSearchChange={setSearch}
        onPlanFilterChange={setPlanFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <AdminTenantsTable
        loading={loading}
        filtered={filtered}
        paginated={paginated}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onManage={openTenant}
      />

      <AdminTenantManagementDialog
        selected={selected}
        newPlan={newPlan}
        newBillingDate={newBillingDate}
        suspendReason={suspendReason}
        saving={saving}
        onOpenChange={(open) => {
          if (!open) setSelected(getAdminTenantCloseState())
        }}
        onPlanChange={setNewPlan}
        onBillingDateChange={setNewBillingDate}
        onSuspendReasonChange={setSuspendReason}
        onSave={handleSave}
        onSuspend={handleSuspend}
        onReactivate={handleReactivate}
      />
    </div>
  )
}
