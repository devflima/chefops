import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/mercadopago', () => ({
  refundPaymentById: vi.fn(),
}))

vi.mock('@/lib/tenant-mercadopago', () => ({
  getTenantMercadoPagoAccessToken: vi.fn(),
}))

const { createAdminClient } = await import('@/lib/supabase/admin')
const { refundPaymentById } = await import('@/lib/mercadopago')
const { getTenantMercadoPagoAccessToken } = await import('@/lib/tenant-mercadopago')
const { refundOrderIfNeeded } = await import('@/lib/order-refunds')

describe('order refunds wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refundOrderIfNeeded delega para as dependências reais do módulo', async () => {
    const admin = {
      from: () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'order-1',
            tenant_id: 'tenant-1',
            payment_status: 'paid',
            payment_provider: 'mercado_pago',
            payment_transaction_id: 'pay-1',
            refunded_at: null,
          },
          error: null,
        }),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      }),
    }

    vi.mocked(createAdminClient).mockReturnValue(admin as never)
    vi.mocked(getTenantMercadoPagoAccessToken).mockResolvedValue('tenant-token' as never)
    vi.mocked(refundPaymentById).mockResolvedValue({ id: 1 } as never)

    await expect(refundOrderIfNeeded('order-1')).resolves.toEqual({ refunded: true })
    expect(createAdminClient).toHaveBeenCalled()
    expect(getTenantMercadoPagoAccessToken).toHaveBeenCalledWith('tenant-1')
    expect(refundPaymentById).toHaveBeenCalledWith({
      paymentId: 'pay-1',
      accessToken: 'tenant-token',
    })
  })
})
