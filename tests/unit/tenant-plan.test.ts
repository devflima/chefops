import { describe, expect, it } from 'vitest'

import { getPersistedTenantPlanSnapshot, getPlanResourceLimit, getTenantPlanSnapshot } from '@/lib/tenant-plan'

describe('tenant plan snapshot', () => {
  it('normaliza limites e features do plano free', () => {
    expect(getPersistedTenantPlanSnapshot('free')).toEqual({
      plan: 'free',
      max_users: 2,
      max_tables: 0,
      max_products: 20,
      features: ['orders', 'menu', 'payments', 'team'],
    })

    expect(getTenantPlanSnapshot('free')).toMatchObject({
      plan: 'free',
      resource_limits: {
        categories: 10,
        extras: 20,
        menu_items: 30,
      },
    })
  })

  it('expõe helper de limite por recurso', () => {
    expect(getPlanResourceLimit('free', 'categories')).toBe(10)
    expect(getPlanResourceLimit('free', 'extras')).toBe(20)
    expect(getPlanResourceLimit('free', 'menu_items')).toBe(30)
    expect(getPlanResourceLimit('pro', 'menu_items')).toBe(-1)
  })
})
