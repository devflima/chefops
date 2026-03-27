import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createMockSupabaseClient } from '@/tests/helpers/mock-supabase'
import {
  sendCustomerPhoneVerificationCode,
  verifyCustomerPhoneVerificationCode,
} from '@/lib/customer-phone-verification'

describe('customer phone verification service', () => {
  it('bloqueia reenvio de código dentro da janela de cooldown', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const admin = createMockSupabaseClient({
      customer_phone_verifications: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'verification-recent',
              sent_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            error: null,
          }
        }

        throw new Error('Nenhuma outra operação deveria ser executada.')
      },
      tenants: () => {
        throw new Error('Não deveria consultar tenant quando o cooldown bloqueia antes.')
      },
    })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await expect(
      sendCustomerPhoneVerificationCode({
        tenantId: 'tenant-1',
        phone: '11999999999',
      }),
    ).rejects.toThrow('Aguarde 1 minuto para solicitar um novo código.')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('bloqueia verificacao quando o codigo ja excedeu o limite de tentativas', async () => {
    const admin = createMockSupabaseClient({
      customer_phone_verifications: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'verification-1',
              code_hash: 'hash',
              expires_at: '2099-03-27T10:00:00.000Z',
              attempts: 5,
            },
            error: null,
          }
        }

        throw new Error('Nenhum update deveria acontecer após bloquear o código.')
      },
    })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await expect(
      verifyCustomerPhoneVerificationCode({
        tenantId: 'tenant-1',
        phone: '11999999999',
        code: '123456',
      }),
    ).resolves.toEqual({
      verified: false,
      reason: 'too_many_attempts',
    })
  })

  it('bloqueia o codigo ao atingir a quinta tentativa invalida', async () => {
    let updateValues: Record<string, unknown> | undefined

    const admin = createMockSupabaseClient({
      customer_phone_verifications: (state) => {
        if (state.operation === 'select') {
          return {
            data: {
              id: 'verification-2',
              code_hash: 'hash-diferente',
              expires_at: '2099-03-27T10:00:00.000Z',
              attempts: 4,
            },
            error: null,
          }
        }

        if (state.operation === 'update') {
          updateValues = state.values
          return { data: null, error: null }
        }

        throw new Error('Operação inesperada')
      },
    })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await expect(
      verifyCustomerPhoneVerificationCode({
        tenantId: 'tenant-1',
        phone: '11999999999',
        code: '123456',
      }),
    ).resolves.toEqual({
      verified: false,
      reason: 'too_many_attempts',
    })

    expect(updateValues).toEqual({ attempts: 5 })
  })
})
