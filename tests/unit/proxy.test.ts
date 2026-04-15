import { beforeEach, describe, expect, it, vi } from 'vitest'

const createServerClientMock = vi.fn()
const nextMock = vi.fn((payload?: unknown) => ({ kind: 'next', payload, cookies: { set: vi.fn() } }))
const redirectMock = vi.fn((url: URL) => ({ kind: 'redirect', url: String(url) }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    NextResponse: {
      next: nextMock,
      redirect: redirectMock,
    },
  }
})

const { proxy } = await import('@/proxy')

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it('segue a requisição sem criar client quando as envs do Supabase não existem', async () => {
    const request = {
      nextUrl: { pathname: '/chefops/menu', clone: () => new URL('https://chefops.test/chefops/menu') },
      cookies: { getAll: vi.fn(() => []), set: vi.fn() },
    }

    const response = await proxy(request as never)

    expect(createServerClientMock).not.toHaveBeenCalled()
    expect(nextMock).toHaveBeenCalled()
    expect(response).toMatchObject({ kind: 'next' })
  })

  it('cria o client quando as envs existem', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    createServerClientMock.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    })

    const request = {
      nextUrl: { pathname: '/chefops/menu', clone: () => new URL('https://chefops.test/chefops/menu') },
      cookies: { getAll: vi.fn(() => []), set: vi.fn() },
    }

    await proxy(request as never)

    expect(createServerClientMock).toHaveBeenCalledWith(
      'https://supabase.test',
      'anon-key',
      expect.any(Object),
    )
  })
})
