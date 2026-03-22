import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()
const stateSetters: Array<ReturnType<typeof vi.fn>> = []
let effectCleanup: undefined | (() => void)

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')

  return {
    ...actual,
    useState: (initialValue: unknown) => {
      const setter = vi.fn()
      stateSetters.push(setter)
      return [initialValue, setter]
    },
    useEffect: (callback: () => void | (() => void)) => {
      effectCleanup = callback() ?? undefined
    },
  }
})

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stateSetters.length = 0
    effectCleanup = undefined
  })

  it('limpa loading quando não existe usuário autenticado', async () => {
    const unsubscribe = vi.fn()
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        onAuthStateChange: vi.fn(() => ({
          data: {
            listener: true,
            subscription: { unsubscribe },
          },
        })),
      },
      from: vi.fn(),
    })

    const { useUser } = await import('@/features/auth/hooks/useUser')
    const result = useUser()

    expect(result).toEqual({ user: null, loading: true })
    await Promise.resolve()
    await Promise.resolve()

    expect(stateSetters[0]).toHaveBeenCalledWith(null)
    expect(stateSetters[1]).toHaveBeenCalledWith(false)

    effectCleanup?.()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('carrega perfil e tenant quando usuário existe', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'chef@ops.dev',
            },
          },
        }),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                full_name: 'Chef Ops',
                role: 'owner',
                tenant_id: 'tenant-1',
                tenants: [
                  {
                    id: 'tenant-1',
                    name: 'ChefOps',
                    slug: 'chefops',
                    plan: 'pro',
                  },
                ],
              },
            }),
          })),
        })),
      })),
    })

    const { useUser } = await import('@/features/auth/hooks/useUser')
    useUser()
    await Promise.resolve()
    await Promise.resolve()

    expect(stateSetters[0]).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'chef@ops.dev',
      profile: {
        full_name: 'Chef Ops',
        role: 'owner',
        tenant_id: 'tenant-1',
        tenant: {
          id: 'tenant-1',
          name: 'ChefOps',
          slug: 'chefops',
          plan: 'pro',
        },
      },
    })
    expect(stateSetters[1]).toHaveBeenCalledWith(false)
  })

  it('zera usuário quando perfil não existe', async () => {
    createClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-2',
              email: 'semperfil@ops.dev',
            },
          },
        }),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
            }),
          })),
        })),
      })),
    })

    const { useUser } = await import('@/features/auth/hooks/useUser')
    useUser()
    await Promise.resolve()
    await Promise.resolve()

    expect(stateSetters[0]).toHaveBeenCalledWith(null)
    expect(stateSetters[1]).toHaveBeenCalledWith(false)
  })
})
