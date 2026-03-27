import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/customer-phone-verification', () => ({
  sendCustomerPhoneVerificationCode: vi.fn(),
  verifyCustomerPhoneVerificationCode: vi.fn(),
}))

const { sendCustomerPhoneVerificationCode, verifyCustomerPhoneVerificationCode } = await import(
  '@/lib/customer-phone-verification'
)
const sendRoute = await import('@/app/api/public/phone-verification/send/route')
const verifyRoute = await import('@/app/api/public/phone-verification/verify/route')

describe('api public phone verification routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia código e confirma telefone', async () => {
    vi.mocked(sendCustomerPhoneVerificationCode).mockResolvedValueOnce({
      sent: true,
      expiresInMinutes: 10,
    } as never)
    vi.mocked(verifyCustomerPhoneVerificationCode).mockResolvedValueOnce({
      verified: true,
    } as never)

    const sendResponse = await sendRoute.POST(
      new Request('https://chefops.test/api/public/phone-verification/send', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          phone: '11999999999',
        }),
      }) as never,
    )

    expect(sendResponse.status).toBe(200)
    await expect(sendResponse.json()).resolves.toEqual({
      data: { sent: true, expiresInMinutes: 10 },
    })

    const verifyResponse = await verifyRoute.POST(
      new Request('https://chefops.test/api/public/phone-verification/verify', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          phone: '11999999999',
          code: '123456',
        }),
      }) as never,
    )

    expect(verifyResponse.status).toBe(200)
    await expect(verifyResponse.json()).resolves.toEqual({
      data: { verified: true },
    })
  })

  it('retorna erros de validação e código expirado', async () => {
    expect(
      (
        await sendRoute.POST(
          new Request('https://chefops.test/api/public/phone-verification/send', {
            method: 'POST',
            body: JSON.stringify({ tenant_id: 'bad-id', phone: '1199' }),
          }) as never,
        )
      ).status
    ).toBe(400)

    vi.mocked(verifyCustomerPhoneVerificationCode).mockResolvedValueOnce({
      verified: false,
      reason: 'expired',
    } as never)

    const verifyResponse = await verifyRoute.POST(
      new Request('https://chefops.test/api/public/phone-verification/verify', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          phone: '11999999999',
          code: '123456',
        }),
      }) as never,
    )

    expect(verifyResponse.status).toBe(400)
    await expect(verifyResponse.json()).resolves.toEqual({
      error: 'O código expirou. Solicite um novo.',
    })
  })
})
