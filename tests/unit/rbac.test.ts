import { describe, expect, it } from 'vitest'

import {
  canAccessDashboardPath,
  canAssignRole,
  formatRoleLabel,
  getAvailableRolesForPlan,
  getRoleCounts,
} from '@/lib/rbac'

describe('rbac', () => {
  it('getRoleCounts ignora roles inválidos e contabiliza os válidos', () => {
    const counts = getRoleCounts([
      { role: 'owner' },
      { role: 'cashier' },
      { role: 'cashier' },
      { role: 'unknown' },
      { role: null },
    ])

    expect(counts).toEqual({
      owner: 1,
      manager: 0,
      cashier: 2,
      kitchen: 0,
    })
  })

  it('getAvailableRolesForPlan restringe owner no plano free', () => {
    expect(getAvailableRolesForPlan('free')).toEqual(['manager', 'cashier', 'kitchen'])
    expect(getAvailableRolesForPlan('pro')).toEqual(['owner', 'manager', 'cashier', 'kitchen'])
  })

  it('canAssignRole respeita limite total e limite por perfil', () => {
    expect(
      canAssignRole({
        plan: 'free',
        counts: { owner: 1, manager: 1, cashier: 0, kitchen: 0 },
        nextRole: 'cashier',
      })
    ).toBe(false)

    expect(
      canAssignRole({
        plan: 'pro',
        counts: { owner: 2, manager: 0, cashier: 0, kitchen: 0 },
        nextRole: 'owner',
      })
    ).toBe(false)
  })

  it('canAccessDashboardPath protege rotas aninhadas e libera rotas sem mapeamento', () => {
    expect(canAccessDashboardPath('cashier', '/pedidos/123')).toBe(true)
    expect(canAccessDashboardPath('cashier', '/usuarios')).toBe(false)
    expect(canAccessDashboardPath('kitchen', '/rota-sem-regra')).toBe(true)
    expect(canAccessDashboardPath(null, '/dashboard')).toBe(false)
  })

  it('formatRoleLabel trata ausência de perfil e fallback textual', () => {
    expect(formatRoleLabel(undefined)).toBe('Sem perfil')
    expect(formatRoleLabel('manager')).toBe('Manager')
    expect(formatRoleLabel('custom')).toBe('custom')
  })
})
