import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const loadAdminTenantsMock = vi.fn()
const saveAdminTenantChangesMock = vi.fn()
const suspendAdminTenantMock = vi.fn()
const reactivateAdminTenantMock = vi.fn()

let capturedTableProps: Record<string, unknown> | null = null
let capturedDialogProps: Record<string, unknown> | null = null
let capturedFiltersProps: Record<string, unknown> | null = null
let capturedStatsProps: Record<string, unknown> | null = null

vi.mock('@/features/admin/AdminTenantsTable', () => ({
  AdminTenantsTable: (props: Record<string, unknown>) => {
    capturedTableProps = props
    return React.createElement('div', null, 'Admin Tenants Table Mock')
  },
}))

vi.mock('@/features/admin/AdminTenantManagementDialog', () => ({
  AdminTenantManagementDialog: (props: Record<string, unknown>) => {
    capturedDialogProps = props
    return React.createElement('div', null, 'Admin Tenant Management Dialog Mock')
  },
}))

vi.mock('@/features/admin/AdminTenantsFilters', () => ({
  AdminTenantsFilters: (props: Record<string, unknown>) => {
    capturedFiltersProps = props
    return React.createElement('div', null, 'Admin Tenants Filters Mock')
  },
}))

vi.mock('@/features/admin/AdminTenantsStats', () => ({
  AdminTenantsStats: (props: Record<string, unknown>) => {
    capturedStatsProps = props
    return React.createElement('div', null, 'Admin Tenants Stats Mock')
  },
}))

vi.mock('@/features/admin/admin-tenants-page', async () => {
  const actual = await vi.importActual<typeof import('@/features/admin/admin-tenants-page')>(
    '@/features/admin/admin-tenants-page'
  )

  return {
    ...actual,
    loadAdminTenants: (...args: Parameters<typeof loadAdminTenantsMock>) => loadAdminTenantsMock(...args),
    saveAdminTenantChanges: (...args: Parameters<typeof saveAdminTenantChangesMock>) => saveAdminTenantChangesMock(...args),
    suspendAdminTenant: (...args: Parameters<typeof suspendAdminTenantMock>) => suspendAdminTenantMock(...args),
    reactivateAdminTenant: (...args: Parameters<typeof reactivateAdminTenantMock>) => reactivateAdminTenantMock(...args),
  }
})

describe('AdminTenantsPage component', () => {
  it('encaminha ações principais da página admin de tenants', async () => {
    vi.resetModules()

    const selectedTenant = {
      id: 'tenant-1',
      name: 'ChefOps House',
      slug: 'chefops-house',
      plan: 'basic',
      status: 'active',
      created_at: '2026-03-01T00:00:00.000Z',
      suspended_at: null,
      suspension_reason: null,
      next_billing_at: '2026-04-01T00:00:00.000Z',
      total_users: 3,
      total_orders: 22,
      total_revenue: 900,
      last_order_at: '2026-03-20T00:00:00.000Z',
    }

    const setTenants = vi.fn()
    const setLoading = vi.fn()
    const setSearch = vi.fn()
    const setPlanFilter = vi.fn()
    const setStatusFilter = vi.fn()
    const setSelected = vi.fn()
    const setSuspendReason = vi.fn()
    const setNewPlan = vi.fn()
    const setNewBillingDate = vi.fn()
    const setSaving = vi.fn()
    const setPage = vi.fn()

    loadAdminTenantsMock.mockResolvedValue([selectedTenant])
    saveAdminTenantChangesMock.mockResolvedValue(undefined)
    suspendAdminTenantMock.mockResolvedValue(undefined)
    reactivateAdminTenantMock.mockResolvedValue(undefined)

    vi.doMock('react', async () => {
      const actualReact = await vi.importActual<typeof import('react')>('react')
      let stateCall = 0

      return {
        ...actualReact,
        useEffect: vi.fn(),
        useState: (initialValue: unknown) => {
          stateCall += 1

          const valuesByCall = new Map<number, [unknown, ReturnType<typeof vi.fn>]>([
            [1, [[selectedTenant], setTenants]],
            [2, [false, setLoading]],
            [3, ['', setSearch]],
            [4, ['all', setPlanFilter]],
            [5, ['all', setStatusFilter]],
            [6, [selectedTenant, setSelected]],
            [7, ['', setSuspendReason]],
            [8, ['basic', setNewPlan]],
            [9, ['2026-04-01', setNewBillingDate]],
            [10, [false, setSaving]],
            [11, [1, setPage]],
          ])

          return valuesByCall.get(stateCall) ?? [initialValue, vi.fn()]
        },
      }
    })

    const { default: AdminTenantsPage } = await import('@/app/admin/tenants/page')

    expect(renderToStaticMarkup(React.createElement(AdminTenantsPage))).toContain('Admin Tenants Table Mock')
    expect(capturedTableProps).toBeTruthy()
    expect(capturedDialogProps).toBeTruthy()
    expect(capturedFiltersProps).toBeTruthy()
    expect(capturedStatsProps).toBeTruthy()

    const tableProps = capturedTableProps as {
      onManage: (tenant: typeof selectedTenant) => void
      onPageChange: (page: number) => void
    }
    const dialogProps = capturedDialogProps as {
      onOpenChange: (open: boolean) => void
      onPlanChange: (value: 'free' | 'basic' | 'pro') => void
      onBillingDateChange: (value: string) => void
      onSuspendReasonChange: (value: string) => void
      onSave: () => Promise<void>
      onSuspend: () => Promise<void>
      onReactivate: () => Promise<void>
    }
    const filtersProps = capturedFiltersProps as {
      onSearchChange: (value: string) => void
      onPlanFilterChange: (value: 'all' | 'free' | 'basic' | 'pro') => void
      onStatusFilterChange: (value: 'all' | 'active' | 'inactive' | 'suspended') => void
    }
    const statsProps = capturedStatsProps as {
      cards: Array<{ title: string; value: string }>
    }

    expect(statsProps.cards).toHaveLength(4)

    tableProps.onManage(selectedTenant)
    tableProps.onPageChange(2)
    filtersProps.onSearchChange('chef')
    filtersProps.onPlanFilterChange('pro')
    filtersProps.onStatusFilterChange('suspended')
    dialogProps.onPlanChange('pro')
    dialogProps.onBillingDateChange('2026-05-01')
    dialogProps.onSuspendReasonChange('Inadimplência')
    dialogProps.onOpenChange(false)
    await dialogProps.onSave()
    await dialogProps.onSuspend()
    await dialogProps.onReactivate()

    expect(setSelected).toHaveBeenCalledWith(selectedTenant)
    expect(setNewPlan).toHaveBeenCalledWith('basic')
    expect(setSuspendReason).toHaveBeenCalledWith('')
    expect(setNewBillingDate).toHaveBeenCalledWith('2026-04-01')
    expect(setPage).toHaveBeenCalledWith(2)
    expect(setSearch).toHaveBeenCalledWith('chef')
    expect(setPlanFilter).toHaveBeenCalledWith('pro')
    expect(setStatusFilter).toHaveBeenCalledWith('suspended')
    expect(setNewPlan).toHaveBeenCalledWith('pro')
    expect(setNewBillingDate).toHaveBeenCalledWith('2026-05-01')
    expect(setSuspendReason).toHaveBeenCalledWith('Inadimplência')
    expect(setSelected).toHaveBeenCalledWith(null)

    expect(saveAdminTenantChangesMock).toHaveBeenCalledWith('tenant-1', 'basic', '2026-04-01')
    expect(suspendAdminTenantMock).toHaveBeenCalledWith('tenant-1', '')
    expect(reactivateAdminTenantMock).toHaveBeenCalledWith('tenant-1')
    expect(loadAdminTenantsMock).toHaveBeenCalledTimes(3)
    expect(setLoading).toHaveBeenCalledWith(true)
    expect(setLoading).toHaveBeenCalledWith(false)
    expect(setTenants).toHaveBeenCalledWith([selectedTenant])
    expect(setSaving).toHaveBeenCalledWith(true)
    expect(setSaving).toHaveBeenCalledWith(false)

    vi.doUnmock('react')
    vi.resetModules()
  })
})
