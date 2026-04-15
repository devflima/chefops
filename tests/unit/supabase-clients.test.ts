import { beforeEach, describe, expect, it, vi } from 'vitest'

const createBrowserClientMock = vi.fn(() => ({ browser: true }))
const createServerClientMock = vi.fn(() => ({ server: true }))
const cookiesMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: createBrowserClientMock,
  createServerClient: createServerClientMock,
}))

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}))

const browserClient = await import('@/lib/supabase/client')
const serverClient = await import('@/lib/supabase/server')

describe('supabase clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  it('cria browser client com fallback quando faltam envs', () => {
    expect(browserClient.createClient()).toEqual({ browser: true })
    expect(createBrowserClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'example-anon-key')
  })

  it('cria browser client com url e anon key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    expect(browserClient.createClient()).toEqual({ browser: true })
    expect(createBrowserClientMock).toHaveBeenCalledWith('https://supabase.test', 'anon-key')
  })

  it('cria server client com fallback quando faltam envs', async () => {
    const cookieStore = {
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }

    cookiesMock.mockResolvedValue(cookieStore)

    expect(await serverClient.createClient()).toEqual({ server: true })
    expect(createServerClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'example-anon-key',
      expect.any(Object)
    )
  })

  it('cria server client com cookies bridge', async () => {
    const cookieStore = {
      getAll: vi.fn(() => [{ name: 'a', value: '1' }]),
      set: vi.fn(),
    }

    cookiesMock.mockResolvedValue(cookieStore)
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    expect(await serverClient.createClient()).toEqual({ server: true })

    const options = createServerClientMock.mock.calls[0]?.[2]
    expect(options.cookies.getAll()).toEqual([{ name: 'a', value: '1' }])
    options.cookies.setAll([{ name: 'a', value: '1', options: { path: '/' } }])
    expect(cookieStore.set).toHaveBeenCalledWith('a', '1', { path: '/' })
  })
})
