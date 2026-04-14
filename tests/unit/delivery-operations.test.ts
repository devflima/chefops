import { describe, expect, it, vi } from 'vitest'

import { isTenantAcceptingOrders, isWithinOperatingHours } from '@/lib/delivery-operations'

describe('delivery operations helpers', () => {
  it('respeita fechamento manual e faixa de horário', () => {
    expect(
      isTenantAcceptingOrders({
        accepting_orders: true,
        schedule_enabled: false,
        opens_at: null,
        closes_at: null,
      })
    ).toBe(true)

    expect(
      isTenantAcceptingOrders({
        accepting_orders: false,
        schedule_enabled: false,
        opens_at: null,
        closes_at: null,
      })
    ).toBe(false)
  })

  it('marca dentro e fora do horário quando a agenda está ativa', () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-04-11T15:00:00.000Z'))
    expect(
      isWithinOperatingHours({
        schedule_enabled: true,
        opens_at: '09:00',
        closes_at: '18:00',
      })
    ).toBe(true)

    vi.setSystemTime(new Date('2026-04-11T23:30:00.000Z'))
    expect(
      isWithinOperatingHours({
        schedule_enabled: true,
        opens_at: '09:00',
        closes_at: '18:00',
      })
    ).toBe(false)

    vi.useRealTimers()
  })

  it('não bloqueia quando o horário ainda não está completo', () => {
    expect(
      isTenantAcceptingOrders({
        accepting_orders: true,
        schedule_enabled: true,
        opens_at: null,
        closes_at: null,
      })
    ).toBe(true)
  })
})
