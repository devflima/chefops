import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const replaceMock = vi.fn()
const usePathnameMock = vi.fn()
const useUserMock = vi.fn()

vi.mock('react', async () => {
  const actualReact = await vi.importActual<typeof import('react')>('react')

  return {
    ...actualReact,
    default: actualReact,
    useEffect: (callback: () => void | (() => void)) => {
      callback()
    },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => usePathnameMock(),
}))

vi.mock('@/features/auth/hooks/useUser', () => ({
  useUser: () => useUserMock(),
}))

describe('DashboardAccessGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/dashboard')
  })

  it('renderiza loading sem redirecionar', async () => {
    const { default: DashboardAccessGuard } = await import('@/features/auth/components/DashboardAccessGuard')

    useUserMock.mockReturnValue({
      user: null,
      loading: true,
    })

    const markup = renderToStaticMarkup(
      React.createElement(DashboardAccessGuard, null, 'guard-child')
    )

    expect(markup).toContain('Carregando permissões')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redireciona quando o perfil nao pode acessar a rota', async () => {
    const { default: DashboardAccessGuard } = await import('@/features/auth/components/DashboardAccessGuard')

    usePathnameMock.mockReturnValue('/usuarios')
    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'cashier',
        },
      },
      loading: false,
    })

    const markup = renderToStaticMarkup(
      React.createElement(DashboardAccessGuard, null, 'guard-child')
    )

    expect(markup).toContain('Redirecionando')
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })

  it('renderiza os filhos quando o perfil pode acessar a rota', async () => {
    const { default: DashboardAccessGuard } = await import('@/features/auth/components/DashboardAccessGuard')

    usePathnameMock.mockReturnValue('/usuarios')
    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'owner',
        },
      },
      loading: false,
    })

    const markup = renderToStaticMarkup(
      React.createElement(DashboardAccessGuard, null, 'guard-child')
    )

    expect(markup).toContain('guard-child')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redireciona quando a role permite, mas o plano não tem a feature da rota', async () => {
    const { default: DashboardAccessGuard } = await import('@/features/auth/components/DashboardAccessGuard')

    usePathnameMock.mockReturnValue('/mesas')
    useUserMock.mockReturnValue({
      user: {
        profile: {
          role: 'owner',
          tenant: {
            plan: 'free',
          },
        },
      },
      loading: false,
    })

    const markup = renderToStaticMarkup(
      React.createElement(DashboardAccessGuard, null, 'guard-child')
    )

    expect(markup).toContain('Redirecionando')
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
