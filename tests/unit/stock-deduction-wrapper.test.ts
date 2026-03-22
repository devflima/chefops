import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const { deductOrderStockIfNeeded } = await import('@/lib/stock-deduction')

describe('stock deduction wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deductOrderStockIfNeeded usa o admin client padrão', async () => {
    const admin = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'order-1',
                tenant_id: 'tenant-1',
                order_number: 1,
                stock_deducted_at: '2026-03-20T10:00:00.000Z',
                items: [],
              },
              error: null,
            }),
          }
        }

        return {}
      },
    }

    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await expect(deductOrderStockIfNeeded('order-1', 'user-1')).resolves.toEqual({
      deducted: false,
      reason: 'already-deducted',
    })
    expect(createAdminClient).toHaveBeenCalled()
  })
})
