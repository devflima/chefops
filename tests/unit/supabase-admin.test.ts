import { describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn(() => ({ from: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

const { createAdminClient } = await import('@/lib/supabase/admin')

describe('supabase admin', () => {
  it('cria client admin com as credenciais do ambiente', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'

    const client = createAdminClient()

    expect(createClientMock).toHaveBeenCalledWith(
      'https://supabase.test',
      'service-role',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    expect(client).toEqual({ from: expect.any(Function) })
  })
})
